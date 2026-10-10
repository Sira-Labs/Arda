/**
 * The ʿarḍ log in Postgres (spec T4, S4.3; ADR-0025; migration 0013): which sūras each student
 * recited to the sheikh, when, and his verdict. Answers to recordings are written by the
 * recording repository in its own transaction (`writeAnswerEntry`); the sheikh writes what was
 * recited face to face. Who may call what is decided by the routes' policies; the queries keep a
 * teacher to the ḥalaqa in the path and a student to their own entries.
 */
import type pg from 'pg';
import type { Mark, RemarkId, Verdict } from '../recordings/repository.js';

export const SOURCES = ['recording', 'in_person'] as const;
export type Source = (typeof SOURCES)[number];

/** The calendar a recording's day is read in when the student has not set a time zone. */
export const HOME_TIME_ZONE = 'Europe/Berlin';

/** `YYYY-MM-DD` of `date` on the calendar of `timeZone` (the home one when unknown). */
export function dayIn(date: Date, timeZone: string | null): string {
  const format = (zone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  try {
    return format(timeZone ?? HOME_TIME_ZONE);
  } catch (error) {
    // A zone Intl does not know (the account route checks, older rows may not).
    if (error instanceof RangeError) return format(HOME_TIME_ZONE);
    throw error;
  }
}

export interface ArdaEntry {
  id: string;
  halaqaId: string;
  studentId: string;
  studentName: string | null;
  range: { sura: number; from: number; to: number };
  /** The day of the recitation, `YYYY-MM-DD`. */
  recitedOn: string;
  verdict: Verdict;
  remark: RemarkId | null;
  note: string | null;
  /** In reading order; only answers to recordings mark words. */
  marks: Mark[];
  source: Source;
  /** The recording it answers, while the student keeps it. */
  recordingId: string | null;
  writtenByName: string | null;
  createdAt: string;
}

/** How often a student recited a sūra, when last and with what verdict. */
export interface SuraSummary {
  sura: number;
  times: number;
  lastOn: string;
  lastVerdict: Verdict;
}

/** A ḥalaqa's log per student and sūra, for its teachers. */
export interface StudentSuraSummary extends SuraSummary {
  studentId: string;
  studentName: string | null;
}

/** A student's own log per ḥalaqa and sūra. */
export interface OwnSuraSummary extends SuraSummary {
  halaqaId: string;
  halaqaName: string;
}

/** What the sheikh writes by hand: a recitation heard face to face. */
export interface NewEntry {
  halaqaId: string;
  studentId: string;
  range: { sura: number; from: number; to: number };
  recitedOn: string;
  verdict: Verdict;
  remark: RemarkId | null;
  note: string | null;
  writtenBy: string;
}

export type AddOutcome =
  { status: 'added'; id: string } | { status: 'not_member' | 'limit' };

export interface EntryPage {
  entries: ArdaEntry[];
  /** Whether more follow; ask again with `before` = the last id. */
  more: boolean;
}

export interface EntryRequest {
  studentId?: string;
  before?: string;
  limit: number;
}

export interface ArdaLogRepository {
  /** Writes a hand entry for an active student of the ḥalaqa, within `limit` per student. */
  add(entry: NewEntry, limit: number): Promise<AddOutcome>;
  /** The ḥalaqa's entries (or one student's), newest recitation first. */
  entries(halaqaId: string, page: EntryRequest): Promise<EntryPage>;
  /** The ḥalaqa's log per student and sūra. */
  summary(halaqaId: string): Promise<StudentSuraSummary[]>;
  /** The student's own log per ḥalaqa and sūra. */
  ownSummary(studentId: string): Promise<OwnSuraSummary[]>;
  /** Removes an entry of this ḥalaqa. */
  remove(halaqaId: string, id: string): Promise<boolean>;
}

/** An answer to a recording, as the log keeps it. */
export interface AnswerEntry {
  recordingId: string;
  halaqaId: string;
  studentId: string;
  range: { sura: number; from: number; to: number };
  recitedOn: string;
  verdict: Verdict;
  remark: RemarkId | null;
  note: string | null;
  marks: readonly Mark[];
  writtenBy: string;
}

/**
 * Writes (or rewrites) the entry of an answered recording, inside the caller's transaction:
 * one entry per recording, whatever was answered before.
 */
export async function writeAnswerEntry(
  client: pg.PoolClient,
  entry: AnswerEntry
): Promise<void> {
  await client.query(
    `insert into arda_log (halaqa_id, student_id, sura, aya_from, aya_to, recited_on, verdict,
                           remark, note, marks, source, recording_id, written_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'recording', $11, $12)
     on conflict (recording_id) do update
       set recited_on = excluded.recited_on, verdict = excluded.verdict,
           remark = excluded.remark, note = excluded.note, marks = excluded.marks,
           written_by = excluded.written_by`,
    [
      entry.halaqaId,
      entry.studentId,
      entry.range.sura,
      entry.range.from,
      entry.range.to,
      entry.recitedOn,
      entry.verdict,
      entry.remark,
      entry.note,
      JSON.stringify(entry.marks),
      entry.recordingId,
      entry.writtenBy,
    ]
  );
}

interface Row {
  id: string;
  halaqa_id: string;
  student_id: string;
  student_name: string | null;
  sura: number;
  aya_from: number;
  aya_to: number;
  recited_on: string;
  verdict: Verdict;
  remark: RemarkId | null;
  note: string | null;
  marks: Mark[];
  source: Source;
  recording_id: string | null;
  written_by_name: string | null;
  created_at: Date;
}

const entryOf = (row: Row): ArdaEntry => ({
  id: row.id,
  halaqaId: row.halaqa_id,
  studentId: row.student_id,
  studentName: row.student_name,
  range: { sura: row.sura, from: row.aya_from, to: row.aya_to },
  recitedOn: row.recited_on,
  verdict: row.verdict,
  remark: row.remark,
  note: row.note,
  marks: row.marks,
  source: row.source,
  recordingId: row.recording_id,
  writtenByName: row.written_by_name,
  createdAt: new Date(row.created_at).toISOString(),
});

/** Per sūra: how often, the last day, and the verdict of the latest recitation. */
const SUMMARY = `count(*)::int as times, to_char(max(l.recited_on), 'YYYY-MM-DD') as last_on,
  (array_agg(l.verdict order by l.recited_on desc, l.created_at desc, l.id desc))[1]
    as last_verdict`;

interface SummaryRow {
  sura: number;
  times: number;
  last_on: string;
  last_verdict: Verdict;
}

const summaryOf = (row: SummaryRow): SuraSummary => ({
  sura: row.sura,
  times: row.times,
  lastOn: row.last_on,
  lastVerdict: row.last_verdict,
});

export class PgArdaLogRepository implements ArdaLogRepository {
  constructor(private readonly pool: pg.Pool) {}

  async add(entry: NewEntry, limit: number): Promise<AddOutcome> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      // The membership row is locked, so two entries at once cannot both pass the limit.
      const member = await client.query(
        `select 1 from halaqa_members
          where halaqa_id = $1 and user_id = $2 and halaqa_role = 'student'
            and status = 'active'
          for update`,
        [entry.halaqaId, entry.studentId]
      );
      if (member.rowCount === 0) {
        await client.query('rollback');
        return { status: 'not_member' };
      }
      const count = await client.query<{ count: string }>(
        `select count(*) from arda_log
          where halaqa_id = $1 and student_id = $2 and source = 'in_person'`,
        [entry.halaqaId, entry.studentId]
      );
      if (Number(count.rows[0]?.count ?? 0) >= limit) {
        await client.query('rollback');
        return { status: 'limit' };
      }
      const inserted = await client.query<{ id: string }>(
        `insert into arda_log (halaqa_id, student_id, sura, aya_from, aya_to, recited_on,
                               verdict, remark, note, source, written_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'in_person', $10)
         returning id`,
        [
          entry.halaqaId,
          entry.studentId,
          entry.range.sura,
          entry.range.from,
          entry.range.to,
          entry.recitedOn,
          entry.verdict,
          entry.remark,
          entry.note,
          entry.writtenBy,
        ]
      );
      await client.query('commit');
      return { status: 'added', id: inserted.rows[0]!.id };
    } catch (error) {
      await client.query('rollback').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async entries(halaqaId: string, page: EntryRequest): Promise<EntryPage> {
    const values: unknown[] = [halaqaId];
    let where = 'l.halaqa_id = $1';
    if (page.studentId) {
      values.push(page.studentId);
      where += ` and l.student_id = $${values.length}`;
    }
    if (page.before) {
      values.push(page.before);
      where += ` and (l.recited_on, l.created_at, l.id) <
        (select recited_on, created_at, id from arda_log
          where id = $${values.length} and halaqa_id = $1)`;
    }
    values.push(page.limit + 1);
    const { rows } = await this.pool.query<Row>(
      `select l.id, l.halaqa_id, l.student_id, nullif(btrim(s.name), '') as student_name,
              l.sura, l.aya_from, l.aya_to, to_char(l.recited_on, 'YYYY-MM-DD') as recited_on,
              l.verdict, l.remark, l.note, l.marks, l.source, l.recording_id,
              nullif(btrim(w.name), '') as written_by_name, l.created_at
         from arda_log l
         join users s on s.id = l.student_id
         left join users w on w.id = l.written_by
        where ${where}
        order by l.recited_on desc, l.created_at desc, l.id desc
        limit $${values.length}`,
      values
    );
    return {
      entries: rows.slice(0, page.limit).map(entryOf),
      more: rows.length > page.limit,
    };
  }

  async summary(halaqaId: string): Promise<StudentSuraSummary[]> {
    const { rows } = await this.pool.query<
      SummaryRow & { student_id: string; student_name: string | null }
    >(
      `select l.student_id, nullif(btrim(s.name), '') as student_name, l.sura, ${SUMMARY}
         from arda_log l
         join users s on s.id = l.student_id
        where l.halaqa_id = $1
        group by l.student_id, s.name, l.sura
        order by s.name nulls last, l.student_id, l.sura`,
      [halaqaId]
    );
    return rows.map((row) => ({
      ...summaryOf(row),
      studentId: row.student_id,
      studentName: row.student_name,
    }));
  }

  async ownSummary(studentId: string): Promise<OwnSuraSummary[]> {
    const { rows } = await this.pool.query<
      SummaryRow & { halaqa_id: string; halaqa_name: string }
    >(
      `select l.halaqa_id, h.name as halaqa_name, l.sura, ${SUMMARY}
         from arda_log l
         join halaqat h on h.id = l.halaqa_id
        where l.student_id = $1
        group by l.halaqa_id, h.name, l.sura
        order by h.name, l.halaqa_id, l.sura`,
      [studentId]
    );
    return rows.map((row) => ({
      ...summaryOf(row),
      halaqaId: row.halaqa_id,
      halaqaName: row.halaqa_name,
    }));
  }

  async remove(halaqaId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'delete from arda_log where id = $2 and halaqa_id = $1',
      [halaqaId, id]
    );
    return (rowCount ?? 0) > 0;
  }
}
