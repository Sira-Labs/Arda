/**
 * The speech check's work list and hints in Postgres (migration 0017; ADR-0013 update
 * 2026-11-15). The api hands each recording to `arda-speech` once; a claim is a lease, so two
 * api instances never check the same take and a check that died is taken up again.
 */
import type pg from 'pg';
import type { RecordingMime } from '../recordings/repository.js';
import type { Hint } from './checker.js';

/** A recording taken for a check: its sound and what it recites. */
export interface ClaimedRecording {
  id: string;
  range: { sura: number; from: number; to: number };
  mime: RecordingMime;
  audio: Buffer;
}

export interface ClaimRequest {
  /** How many to take at most. */
  limit: number;
  /** A recording is tried this often before it is left alone. */
  maxAttempts: number;
  /** A `pending` check older than this was lost and is taken again. */
  leaseMs: number;
}

export interface SpeechRepository {
  /**
   * Takes recordings that were never checked, failed fewer than `maxAttempts` times or whose
   * lease ran out, oldest first, and marks them `pending`.
   */
  claim(request: ClaimRequest): Promise<ClaimedRecording[]>;
  /** Keeps the hints (replacing earlier ones) and marks the check done. */
  done(recordingId: string, model: string, hints: readonly Hint[]): Promise<void>;
  /** Marks the check failed with a short reason; it is tried again until `maxAttempts`. */
  failed(recordingId: string, reason: string): Promise<void>;
}

export class PgSpeechRepository implements SpeechRepository {
  constructor(private readonly pool: pg.Pool) {}

  async claim(request: ClaimRequest): Promise<ClaimedRecording[]> {
    // One statement claims and reads. Rows another instance is claiming right now are skipped
    // (`skip locked`); one that claimed a moment ago is found by the upsert's own condition.
    const { rows } = await this.pool.query<{
      id: string;
      sura: number;
      aya_from: number;
      aya_to: number;
      mime: RecordingMime;
      data: Buffer;
    }>(
      `with open as (
         select r.id
           from recordings r
           left join recording_checks c on c.recording_id = r.id
          where c.recording_id is null
             or (c.status = 'failed' and c.attempts < $2)
             or (c.status = 'pending' and c.attempts < $2
                 and c.updated_at < now() - make_interval(secs => $3::double precision / 1000))
          order by r.created_at, r.id
          limit $1
          for update of r skip locked
       ), claimed as (
         insert into recording_checks (recording_id, status)
         select id, 'pending' from open
         on conflict (recording_id) do update
           set status = 'pending', attempts = recording_checks.attempts + 1, error = null,
               updated_at = now()
           -- Decided again on the row as it is now: a taker whose snapshot is older than
           -- another's claim finds that claim here and leaves the recording to it.
           where recording_checks.attempts < $2
             and (recording_checks.status = 'failed'
                  or (recording_checks.status = 'pending'
                      and recording_checks.updated_at
                          < now() - make_interval(secs => $3::double precision / 1000)))
         returning recording_id
       )
       select r.id, r.sura, r.aya_from, r.aya_to, r.mime, a.data
         from claimed
         join recordings r on r.id = claimed.recording_id
         join recording_audio a on a.recording_id = r.id
        order by r.created_at, r.id`,
      [request.limit, request.maxAttempts, request.leaseMs]
    );
    return rows.map((row) => ({
      id: row.id,
      range: { sura: row.sura, from: row.aya_from, to: row.aya_to },
      mime: row.mime,
      audio: row.data,
    }));
  }

  async done(recordingId: string, model: string, hints: readonly Hint[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      // The recording may be gone by now (the student deleted it): then nothing is kept.
      const { rowCount } = await client.query(
        `update recording_checks
            set status = 'done', model = $2, error = null, updated_at = now()
          where recording_id = $1`,
        [recordingId, model]
      );
      if (rowCount) {
        await client.query('delete from recording_hints where recording_id = $1', [
          recordingId,
        ]);
        if (hints.length > 0) {
          await client.query(
            `insert into recording_hints (recording_id, aya, word, topic, verdict)
             select $1, h.aya, h.word, h.topic, h.verdict
               from jsonb_to_recordset($2::jsonb)
                    as h(aya smallint, word smallint, topic text, verdict text)`,
            [recordingId, JSON.stringify(hints)]
          );
        }
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async failed(recordingId: string, reason: string): Promise<void> {
    await this.pool.query(
      `update recording_checks
          set status = 'failed', error = $2, updated_at = now()
        where recording_id = $1 and status = 'pending'`,
      [recordingId, reason.slice(0, 200)]
    );
  }
}
