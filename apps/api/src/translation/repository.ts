/**
 * The translation cache and the daily count per teacher (ADR-0020, migration 0002).
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
  /** Stores a translation; a concurrent identical one keeps the first. */
  save(entry: {
    createdBy: string;
    sourceHash: string;
    from: Language | null;
    to: Language;
    sourceText: string;
    text: string;
    model: string;
  }): Promise<void>;
  /** Translations this person caused in the last 24 hours (cache hits do not count). */
  countLastDay(userId: string): Promise<number>;
}

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

  async save(entry: Parameters<TranslationRepository['save']>[0]): Promise<void> {
    await this.pool.query(
      `insert into translations
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
      ]
    );
  }

  async countLastDay(userId: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `select count(*) from translations
        where created_by = $1 and created_at > now() - interval '1 day'`,
      [userId]
    );
    return Number(rows[0]?.count ?? 0);
  }
}
