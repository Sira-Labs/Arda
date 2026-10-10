/**
 * Recitations in Postgres (spec F7, T3; ADR-0012; migrations 0006, 0011, 0012). Who may call what is decided
 * by the routes' policies; the queries here additionally keep a student to their own
 * recordings and a teacher to the ḥalaqa in the path. The sound is kept in `recording_audio`
 * until the RustFS bucket exists (ADR-0012 update 2026-10-06), and so is the teacher's voice note.
 * An answer is also written to the ʿarḍ log (ADR-0025) in the same transaction.
 */
import type pg from 'pg';
import { wordCount } from '@arda/quran';
import { dayIn, writeAnswerEntry } from '../ardaLog/repository.js';

export const RECORDING_MIMES = [
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
] as const;
export type RecordingMime = (typeof RECORDING_MIMES)[number];

export const VERDICTS = ['good', 'again'] as const;
export type Verdict = (typeof VERDICTS)[number];

/** The teacher's quick remarks: ids of the web app's catalogs (ADR-0020), exact in every language. */
export const REMARK_IDS = [
  'ghunnaShort',
  'ghunnaLong',
  'nunTooClear',
  'qalqalaMissing',
  'maddShort',
  'sinVoiced',
  'zayVoiceless',
  'raRolled',
  'good',
] as const;
export type RemarkId = (typeof REMARK_IDS)[number];

export interface NewRecording {
  /** The client's id for this take: an upload retried from the outbox lands once. */
  clientId: string;
  halaqaId: string;
  studentId: string;
  /** The assignment it answers; must be one of the student's in this ḥalaqa. */
  assignmentId: string | null;
  range: { sura: number; from: number; to: number };
  mime: RecordingMime;
  durationMs: number;
  audio: Buffer;
}

/** A word the teacher marked: the `word`-th word of āya `aya` of the recited sūra. */
export interface Mark {
  aya: number;
  word: number;
}

/** The most words one answer marks. */
export const MAX_MARKS = 100;

/** What the teacher answers: a verdict, a quick remark, their own words, marked words. */
export interface ReviewInput {
  verdict: Verdict;
  remark: RemarkId | null;
  note: string | null;
  marks: readonly Mark[];
}

/** The teacher's spoken answer, without its sound (served by its own route). */
export interface VoiceNote {
  mime: RecordingMime;
  bytes: number;
  durationMs: number;
}

/** A voice note to keep with an answer. */
export interface NewVoiceNote {
  mime: RecordingMime;
  durationMs: number;
  audio: Buffer;
}

export interface Review {
  verdict: Verdict;
  remark: RemarkId | null;
  note: string | null;
  /** In reading order. */
  marks: Mark[];
  voiceNote: VoiceNote | null;
  reviewerName: string | null;
  reviewedAt: string;
}

/** Whether every mark is a word of the recited āyāt (the packs' word counts). */
export function marksFit(
  range: { sura: number; from: number; to: number },
  marks: readonly Mark[]
): boolean {
  return marks.every(
    ({ aya, word }) =>
      aya >= range.from &&
      aya <= range.to &&
      word >= 1 &&
      word <= (wordCount(range.sura, aya) ?? 0)
  );
}

/** Marks in reading order. */
export const byPlace = (a: Mark, b: Mark): number => a.aya - b.aya || a.word - b.word;

export type ReviewOutcome = 'reviewed' | 'not_found' | 'marks';

/**
 * `not_reviewed`: a voice note belongs to an answer, so the teacher answers the recording
 * first (or again, when another teacher answered it).
 */
export type VoiceNoteOutcome = 'saved' | 'not_found' | 'not_reviewed';

interface RecordingBase {
  id: string;
  halaqaId: string;
  assignmentId: string | null;
  range: { sura: number; from: number; to: number };
  mime: RecordingMime;
  bytes: number;
  durationMs: number;
  createdAt: string;
  review: Review | null;
}

/** A recording as its student sees it. */
export interface OwnRecording extends RecordingBase {
  halaqaName: string;
}

/** A recording as a teacher of its ḥalaqa sees it. */
export interface QueuedRecording extends RecordingBase {
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
}

export interface Page<T> {
  recordings: T[];
  /** Whether more follow; ask again with `before` = the last id. */
  more: boolean;
}

export interface PageRequest {
  before?: string;
  limit: number;
}

export interface Audio {
  mime: RecordingMime;
  data: Buffer;
}

export type SaveOutcome =
  | { status: 'created' | 'existing'; id: string }
  | { status: 'not_member' | 'assignment' | 'limit' };

export interface RecordingRepository {
  /** Stores the take; the same client id again returns the stored one. */
  save(input: NewRecording, limit: number): Promise<SaveOutcome>;
  /** The student's own recordings, newest first. */
  own(studentId: string, page: PageRequest): Promise<Page<OwnRecording>>;
  /** A ḥalaqa's recordings: those waiting first (oldest first), then those answered. */
  queue(halaqaId: string, page: PageRequest): Promise<Page<QueuedRecording>>;
  /** The sound of one of the student's own recordings. */
  ownAudio(studentId: string, recordingId: string): Promise<Audio | null>;
  /** The sound of a recording sent to this ḥalaqa. */
  halaqaAudio(halaqaId: string, recordingId: string): Promise<Audio | null>;
  /**
   * The teacher's answer, replacing an earlier one with its marks and its ʿarḍ log entry:
   * `not_found` when the recording is not in this ḥalaqa, `marks` when a mark is no word of
   * the recited āyāt.
   */
  review(
    halaqaId: string,
    recordingId: string,
    input: ReviewInput,
    reviewerId: string
  ): Promise<ReviewOutcome>;
  /**
   * Keeps the voice note with the teacher's own answer, replacing an earlier one. A later
   * answer by another teacher drops it (`review`): the voice heard is always the answerer's.
   */
  saveVoiceNote(
    halaqaId: string,
    recordingId: string,
    note: NewVoiceNote,
    teacherId: string
  ): Promise<VoiceNoteOutcome>;
  /** Removes the voice note, if any; false when the recording is not in this ḥalaqa. */
  removeVoiceNote(halaqaId: string, recordingId: string): Promise<boolean>;
  /** The voice note on one of the student's own recordings. */
  ownVoiceNote(studentId: string, recordingId: string): Promise<Audio | null>;
  /** The voice note on a recording sent to this ḥalaqa. */
  halaqaVoiceNote(halaqaId: string, recordingId: string): Promise<Audio | null>;
  /** Deletes one of the student's own recordings with its sound. */
  remove(studentId: string, recordingId: string): Promise<boolean>;
}

const iso = (value: Date | string): string => new Date(value).toISOString();

interface Row {
  id: string;
  halaqa_id: string;
  assignment_id: string | null;
  sura: number;
  aya_from: number;
  aya_to: number;
  mime: RecordingMime;
  bytes: number;
  duration_ms: number;
  created_at: Date;
  verdict: Verdict | null;
  remark: RemarkId | null;
  note: string | null;
  reviewer_name: string | null;
  reviewed_at: Date | null;
  marks: Mark[];
  voice_note: VoiceNote | null;
}

const COLUMNS = `r.id, r.halaqa_id, r.assignment_id, r.sura, r.aya_from, r.aya_to, r.mime,
  r.bytes, r.duration_ms, r.created_at, r.verdict, r.remark, r.note,
  nullif(btrim(t.name), '') as reviewer_name, r.reviewed_at,
  coalesce((select json_agg(json_build_object('aya', m.aya, 'word', m.word)
                            order by m.aya, m.word)
              from recording_marks m where m.recording_id = r.id), '[]') as marks,
  (select json_build_object('mime', v.mime, 'bytes', v.bytes, 'durationMs', v.duration_ms)
     from recording_voice_notes v where v.recording_id = r.id) as voice_note`;

const base = (row: Row): RecordingBase => ({
  id: row.id,
  halaqaId: row.halaqa_id,
  assignmentId: row.assignment_id,
  range: { sura: row.sura, from: row.aya_from, to: row.aya_to },
  mime: row.mime,
  bytes: row.bytes,
  durationMs: row.duration_ms,
  createdAt: iso(row.created_at),
  review:
    row.verdict && row.reviewed_at
      ? {
          verdict: row.verdict,
          remark: row.remark,
          note: row.note,
          marks: row.marks,
          voiceNote: row.voice_note,
          reviewerName: row.reviewer_name,
          reviewedAt: iso(row.reviewed_at),
        }
      : null,
});

const pageOf = <T>(rows: T[], limit: number): Page<T> => ({
  recordings: rows.slice(0, limit),
  more: rows.length > limit,
});

export class PgRecordingRepository implements RecordingRepository {
  constructor(private readonly pool: pg.Pool) {}

  async save(input: NewRecording, limit: number): Promise<SaveOutcome> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const existing = await client.query<{ id: string }>(
        'select id from recordings where student_id = $1 and client_id = $2',
        [input.studentId, input.clientId]
      );
      if (existing.rows[0]) {
        await client.query('commit');
        return { status: 'existing', id: existing.rows[0].id };
      }
      const member = await client.query(
        `select 1 from halaqa_members
          where halaqa_id = $1 and user_id = $2 and halaqa_role = 'student'
            and status = 'active'
          for share`,
        [input.halaqaId, input.studentId]
      );
      if (member.rowCount === 0) {
        await client.query('rollback');
        return { status: 'not_member' };
      }
      // One save per student at a time, so two uploads cannot both pass the limit.
      await client.query('select id from users where id = $1 for update', [
        input.studentId,
      ]);
      if (input.assignmentId) {
        const assignment = await client.query(
          `select 1 from assignments
            where id = $1 and halaqa_id = $2 and (student_id is null or student_id = $3)`,
          [input.assignmentId, input.halaqaId, input.studentId]
        );
        if (assignment.rowCount === 0) {
          await client.query('rollback');
          return { status: 'assignment' };
        }
      }
      const count = await client.query<{ count: string }>(
        'select count(*) from recordings where student_id = $1',
        [input.studentId]
      );
      if (Number(count.rows[0]?.count ?? 0) >= limit) {
        await client.query('rollback');
        return { status: 'limit' };
      }
      const inserted = await client.query<{ id: string }>(
        `insert into recordings (client_id, halaqa_id, student_id, assignment_id, sura,
                                 aya_from, aya_to, mime, bytes, duration_ms)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         on conflict (student_id, client_id) do nothing
         returning id`,
        [
          input.clientId,
          input.halaqaId,
          input.studentId,
          input.assignmentId,
          input.range.sura,
          input.range.from,
          input.range.to,
          input.mime,
          input.audio.length,
          input.durationMs,
        ]
      );
      const id = inserted.rows[0]?.id;
      if (!id) {
        // The same take arrived twice at once; the other upload stored it.
        await client.query('rollback');
        const again = await this.pool.query<{ id: string }>(
          'select id from recordings where student_id = $1 and client_id = $2',
          [input.studentId, input.clientId]
        );
        return { status: 'existing', id: again.rows[0]!.id };
      }
      await client.query(
        'insert into recording_audio (recording_id, data) values ($1, $2)',
        [id, input.audio]
      );
      await client.query('commit');
      return { status: 'created', id };
    } catch (error) {
      await client.query('rollback').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async own(studentId: string, page: PageRequest): Promise<Page<OwnRecording>> {
    const values: unknown[] = [studentId];
    let before = '';
    if (page.before) {
      values.push(page.before);
      before = `and (r.created_at, r.id) <
        (select created_at, id from recordings where id = $2 and student_id = $1)`;
    }
    values.push(page.limit + 1);
    const { rows } = await this.pool.query<Row & { halaqa_name: string }>(
      `select ${COLUMNS}, h.name as halaqa_name
         from recordings r
         join halaqat h on h.id = r.halaqa_id
         left join users t on t.id = r.reviewed_by
        where r.student_id = $1 ${before}
        order by r.created_at desc, r.id desc
        limit $${values.length}`,
      values
    );
    return pageOf(
      rows.map((row) => ({ ...base(row), halaqaName: row.halaqa_name })),
      page.limit
    );
  }

  async queue(halaqaId: string, page: PageRequest): Promise<Page<QueuedRecording>> {
    const values: unknown[] = [halaqaId];
    let before = '';
    if (page.before) {
      values.push(page.before);
      before = `and ((r.reviewed_at is not null), r.created_at, r.id) >
        (select (reviewed_at is not null), created_at, id from recordings
          where id = $2 and halaqa_id = $1)`;
    }
    values.push(page.limit + 1);
    const { rows } = await this.pool.query<
      Row & {
        student_id: string;
        student_name: string | null;
        student_email: string | null;
      }
    >(
      `select ${COLUMNS}, r.student_id, nullif(btrim(s.name), '') as student_name,
              s.email as student_email
         from recordings r
         join users s on s.id = r.student_id
         left join users t on t.id = r.reviewed_by
        where r.halaqa_id = $1 ${before}
        order by (r.reviewed_at is not null), r.created_at, r.id
        limit $${values.length}`,
      values
    );
    return pageOf(
      rows.map((row) => ({
        ...base(row),
        studentId: row.student_id,
        studentName: row.student_name,
        studentEmail: row.student_email,
      })),
      page.limit
    );
  }

  async ownAudio(studentId: string, recordingId: string): Promise<Audio | null> {
    const { rows } = await this.pool.query<{ mime: RecordingMime; data: Buffer }>(
      `select r.mime, a.data from recordings r
         join recording_audio a on a.recording_id = r.id
        where r.id = $2 and r.student_id = $1`,
      [studentId, recordingId]
    );
    return rows[0] ?? null;
  }

  async halaqaAudio(halaqaId: string, recordingId: string): Promise<Audio | null> {
    const { rows } = await this.pool.query<{ mime: RecordingMime; data: Buffer }>(
      `select r.mime, a.data from recordings r
         join recording_audio a on a.recording_id = r.id
        where r.id = $2 and r.halaqa_id = $1`,
      [halaqaId, recordingId]
    );
    return rows[0] ?? null;
  }

  async review(
    halaqaId: string,
    recordingId: string,
    input: ReviewInput,
    reviewerId: string
  ): Promise<ReviewOutcome> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const { rows } = await client.query<{
        sura: number;
        aya_from: number;
        aya_to: number;
        student_id: string;
        created_at: Date;
        time_zone: string | null;
      }>(
        `update recordings
            set verdict = $3, remark = $4, note = $5, reviewed_by = $6, reviewed_at = now()
          where id = $2 and halaqa_id = $1
          returning sura, aya_from, aya_to, student_id, created_at,
                    (select time_zone from users where id = recordings.student_id)
                      as time_zone`,
        [halaqaId, recordingId, input.verdict, input.remark, input.note, reviewerId]
      );
      const range = rows[0];
      if (!range) {
        await client.query('rollback');
        return 'not_found';
      }
      if (
        !marksFit(
          { sura: range.sura, from: range.aya_from, to: range.aya_to },
          input.marks
        )
      ) {
        await client.query('rollback');
        return 'marks';
      }
      await client.query('delete from recording_marks where recording_id = $1', [
        recordingId,
      ]);
      // Another teacher's voice does not speak for this answer.
      await client.query(
        'delete from recording_voice_notes where recording_id = $1 and recorded_by <> $2',
        [recordingId, reviewerId]
      );
      await writeAnswerEntry(client, {
        recordingId,
        halaqaId,
        studentId: range.student_id,
        range: { sura: range.sura, from: range.aya_from, to: range.aya_to },
        // The day the student recited it, on their calendar.
        recitedOn: dayIn(new Date(range.created_at), range.time_zone),
        verdict: input.verdict,
        remark: input.remark,
        note: input.note,
        marks: input.marks,
        writtenBy: reviewerId,
      });
      if (input.marks.length > 0) {
        await client.query(
          `insert into recording_marks (recording_id, aya, word)
           select $1, aya, word from unnest($2::smallint[], $3::smallint[]) as m(aya, word)`,
          [recordingId, input.marks.map((m) => m.aya), input.marks.map((m) => m.word)]
        );
      }
      await client.query('commit');
      return 'reviewed';
    } catch (error) {
      await client.query('rollback').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async saveVoiceNote(
    halaqaId: string,
    recordingId: string,
    note: NewVoiceNote,
    teacherId: string
  ): Promise<VoiceNoteOutcome> {
    const { rowCount } = await this.pool.query(
      `insert into recording_voice_notes (recording_id, recorded_by, mime, bytes, duration_ms,
                                          data)
       select r.id, $3, $4, $5, $6, $7 from recordings r
        where r.id = $2 and r.halaqa_id = $1 and r.reviewed_by = $3
       on conflict (recording_id) do update
         set recorded_by = excluded.recorded_by, mime = excluded.mime,
             bytes = excluded.bytes, duration_ms = excluded.duration_ms,
             data = excluded.data, created_at = now()`,
      [
        halaqaId,
        recordingId,
        teacherId,
        note.mime,
        note.audio.length,
        note.durationMs,
        note.audio,
      ]
    );
    if ((rowCount ?? 0) > 0) return 'saved';
    const exists = await this.pool.query(
      'select 1 from recordings where id = $2 and halaqa_id = $1',
      [halaqaId, recordingId]
    );
    return exists.rowCount ? 'not_reviewed' : 'not_found';
  }

  async removeVoiceNote(halaqaId: string, recordingId: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ found: boolean }>(
      `with r as (select id from recordings where id = $2 and halaqa_id = $1),
            gone as (delete from recording_voice_notes v using r where v.recording_id = r.id)
       select exists (select 1 from r) as found`,
      [halaqaId, recordingId]
    );
    return rows[0]?.found ?? false;
  }

  async ownVoiceNote(studentId: string, recordingId: string): Promise<Audio | null> {
    const { rows } = await this.pool.query<{ mime: RecordingMime; data: Buffer }>(
      `select v.mime, v.data from recordings r
         join recording_voice_notes v on v.recording_id = r.id
        where r.id = $2 and r.student_id = $1`,
      [studentId, recordingId]
    );
    return rows[0] ?? null;
  }

  async halaqaVoiceNote(halaqaId: string, recordingId: string): Promise<Audio | null> {
    const { rows } = await this.pool.query<{ mime: RecordingMime; data: Buffer }>(
      `select v.mime, v.data from recordings r
         join recording_voice_notes v on v.recording_id = r.id
        where r.id = $2 and r.halaqa_id = $1`,
      [halaqaId, recordingId]
    );
    return rows[0] ?? null;
  }

  async remove(studentId: string, recordingId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'delete from recordings where id = $2 and student_id = $1',
      [studentId, recordingId]
    );
    return (rowCount ?? 0) > 0;
  }
}
