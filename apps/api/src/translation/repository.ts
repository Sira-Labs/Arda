/**
 * The translation cache and the daily limit per teacher (ADR-0020, migrations 0002, 0020).
 */
import { createHash } from 'node:crypto';
import type pg from 'pg';
import type { Language } from '../i18n/languages.js';

export interface CachedTranslation {
  text: string;
  model: string;
}

export interface TranslationRepository {
  find(sourceHash: string, to: Language): Promise<CachedTranslation | null>;
  /**
   * Holds one place in this person's daily limit before the translator is asked: the id of
   * the reservation, or `null` when translations of the last 24 hours and places still held
   * already reach the limit. Checked and taken in one step per person, so requests in flight
   * together cannot each pass (cache hits never come here).
   */
  reserve(userId: string, dailyLimit: number): Promise<string | null>;
  /** Gives a place back: the translator failed or refused, so nothing is counted. */
  release(reservation: string): Promise<void>;
  /**
   * Stores a translation in place of its reservation; a concurrent identical one keeps the
   * first, and the place is given back.
   */
  save(entry: {
    reservation: string;
    createdBy: string;
    sourceHash: string;
    from: Language | null;
    to: Language;
    sourceText: string;
    text: string;
    model: string;
  }): Promise<void>;
}

/** How long a place stays held for a translator call that never reported back. */
export const RESERVATION_TTL_SECONDS = 120;

/** The cache key: the remark with whitespace normalised, so a stray space does not miss. */
export function sourceHash(text: string): string {
  return createHash('sha256').update(text.trim().replace(/\s+/g, ' ')).digest('hex');
}

export class PgTranslationRepository implements TranslationRepository {
  constructor(private readonly pool: pg.Pool) {}

  async find(hash: string, to: Language): Promise<CachedTranslation | null> {
    const { rows } = await this.pool.query<CachedTranslation>(
      `select text, model from translations
        where source_hash = $1 and target_language = $2`,
      [hash, to]
    );
    return rows[0] ?? null;
  }

  async reserve(userId: string, dailyLimit: number): Promise<string | null> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      // One reservation at a time per person; released with the transaction.
      await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `translate:${userId}`,
      ]);
      const { rows } = await client.query<{ id: string }>(
        `insert into translation_reservations (user_id)
         select $1
          where (select count(*) from translations
                  where created_by = $1 and created_at > now() - interval '1 day')
              + (select count(*) from translation_reservations
                  where user_id = $1
                    and created_at > now() - make_interval(secs => $3))
              < $2
         returning id`,
        [userId, dailyLimit, RESERVATION_TTL_SECONDS]
      );
      await client.query('commit');
      return rows[0] ? String(rows[0].id) : null;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async release(reservation: string): Promise<void> {
    await this.pool.query('delete from translation_reservations where id = $1', [
      reservation,
    ]);
  }

  async save(entry: Parameters<TranslationRepository['save']>[0]): Promise<void> {
    // One statement: the place becomes the translation, or is given back when the same
    // remark was translated meanwhile.
    await this.pool.query(
      `with held as (
         delete from translation_reservations where id = $8
       )
       insert into translations
         (created_by, source_hash, source_language, target_language, source_text, text, model)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (source_hash, target_language) do nothing`,
      [
        entry.createdBy,
        entry.sourceHash,
        entry.from,
        entry.to,
        entry.sourceText,
        entry.text,
        entry.model,
        entry.reservation,
      ]
    );
  }
}
