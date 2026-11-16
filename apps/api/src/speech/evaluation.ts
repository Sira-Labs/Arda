/**
 * Measuring the speech check against the teacher (story S6.2; ADR-0013 update 2026-11-16): the
 * students' opt-in and, per model and rule, how often the check's hints and the teacher's
 * marks say the same of a word. Only counts leave the database: no words, no students.
 */
import type pg from 'pg';
import { writeAudit } from '../audit/log.js';
import { TOPICS, type Topic } from '../rules/repository.js';

/** A rule's check may reach students only from this many compared words on (ADR-0013). */
export const GATE_MIN_OCCURRENCES = 200;
/** … and when the check and the teacher agree on at least this share of them. */
export const GATE_MIN_AGREEMENT = 0.9;

/** The check and the teacher on one rule, for one model. */
export interface Agreement {
  model: string;
  topic: Topic;
  /** The check said `check` and the teacher marked the word for this rule. */
  bothCheck: number;
  /** The check said `good` and the teacher left the word unmarked. */
  bothGood: number;
  /** The check said `check`, the teacher left the word unmarked. */
  falseAlarms: number;
  /** The check said `good`, the teacher marked the word for this rule. */
  misses: number;
  /**
   * Words the teacher marked for another rule or for none he named: he may name one rule per
   * word, so they say nothing about this one and are not compared.
   */
  unclear: number;
  /** Words he marked for this rule that the check did not judge on it. */
  unheard: number;
}

export interface AgreementReport {
  /** Answered, checked recordings of opted-in students that the counts come from. */
  recordings: number;
  students: number;
  rows: Agreement[];
}

/** The words compared: where both the check and the teacher spoke on the rule. */
export const occurrences = (a: Agreement): number =>
  a.bothCheck + a.bothGood + a.falseAlarms + a.misses;

/** The share they agree on, or `null` before anything was compared. */
export function agreementOf(a: Agreement): number | null {
  const total = occurrences(a);
  return total === 0 ? null : (a.bothCheck + a.bothGood) / total;
}

/** Whether the numbers reach ADR-0013's gate. A measure, not the decision to show a rule. */
export function reachesGate(a: Agreement): boolean {
  const share = agreementOf(a);
  return (
    occurrences(a) >= GATE_MIN_OCCURRENCES &&
    share !== null &&
    share >= GATE_MIN_AGREEMENT
  );
}

export interface EvaluationOptIn {
  optedIn: boolean;
  /** When it was given; `null` while it is not. */
  since: string | null;
}

export interface EvaluationRepository {
  optIn(userId: string): Promise<EvaluationOptIn>;
  /** Gives or takes back the opt-in; audited. Asking for what already holds changes nothing. */
  setOptIn(userId: string, optedIn: boolean, ipAddress: string | null): Promise<void>;
  /** The agreement in one ḥalaqa, per model and rule, from who is opted in now. */
  agreement(halaqaId: string): Promise<AgreementReport>;
}

/** Rows by model, then in the order of the topics. */
export function sortAgreement(rows: Agreement[]): Agreement[] {
  return rows.sort(
    (a, b) =>
      a.model.localeCompare(b.model) || TOPICS.indexOf(a.topic) - TOPICS.indexOf(b.topic)
  );
}

export class PgEvaluationRepository implements EvaluationRepository {
  constructor(private readonly pool: pg.Pool) {}

  async optIn(userId: string): Promise<EvaluationOptIn> {
    const { rows } = await this.pool.query<{ opted_in_at: Date }>(
      'select opted_in_at from speech_evaluation_optins where user_id = $1',
      [userId]
    );
    const at = rows[0]?.opted_in_at;
    return { optedIn: Boolean(at), since: at ? at.toISOString() : null };
  }

  async setOptIn(
    userId: string,
    optedIn: boolean,
    ipAddress: string | null
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const { rowCount } = optedIn
        ? await client.query(
            `insert into speech_evaluation_optins (user_id) values ($1)
             on conflict (user_id) do nothing`,
            [userId]
          )
        : await client.query('delete from speech_evaluation_optins where user_id = $1', [
            userId,
          ]);
      if (rowCount) {
        await writeAudit(client, {
          actorId: userId,
          action: optedIn ? 'speech.evaluation_opted_in' : 'speech.evaluation_opted_out',
          targetType: 'user',
          targetId: userId,
          ipAddress,
        });
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async agreement(halaqaId: string): Promise<AgreementReport> {
    // What counts: recordings of this ḥalaqa that a teacher answered, the check heard, and
    // whose student is opted in now.
    const counted = `
      select r.id, r.student_id, c.model
        from recordings r
        join recording_checks c on c.recording_id = r.id and c.status = 'done'
        join speech_evaluation_optins o on o.user_id = r.student_id
       where r.halaqa_id = $1 and r.reviewed_at is not null`;
    // One snapshot for all three counts: an opt-in taken back or an answer changed between
    // them would otherwise give totals and rows that never were true together.
    const client = await this.pool.connect();
    let totals, compared, unheard;
    try {
      await client.query('begin transaction isolation level repeatable read read only');
      totals = await client.query<{ recordings: number; students: number }>(
        `select count(*)::int as recordings, count(distinct student_id)::int as students
           from (${counted}) counted`,
        [halaqaId]
      );
      compared = await client.query<{
        model: string;
        topic: Topic;
        both_check: number;
        both_good: number;
        false_alarms: number;
        misses: number;
        unclear: number;
      }>(
        `select counted.model, h.topic,
                count(*) filter (where h.verdict = 'check' and m.topic = h.topic)::int
                  as both_check,
                count(*) filter (where h.verdict = 'good' and m.recording_id is null)::int
                  as both_good,
                count(*) filter (where h.verdict = 'check' and m.recording_id is null)::int
                  as false_alarms,
                count(*) filter (where h.verdict = 'good' and m.topic = h.topic)::int
                  as misses,
                count(*) filter (where m.recording_id is not null
                                   and m.topic is distinct from h.topic)::int as unclear
           from (${counted}) counted
           join recording_hints h on h.recording_id = counted.id
           left join recording_marks m
             on m.recording_id = h.recording_id and m.aya = h.aya and m.word = h.word
          group by counted.model, h.topic`,
        [halaqaId]
      );
      unheard = await client.query<{ model: string; topic: Topic; unheard: number }>(
        `select counted.model, m.topic, count(*)::int as unheard
           from (${counted}) counted
           join recording_marks m on m.recording_id = counted.id and m.topic is not null
          where not exists (
                  select 1 from recording_hints h
                   where h.recording_id = m.recording_id and h.aya = m.aya
                     and h.word = m.word and h.topic = m.topic)
          group by counted.model, m.topic`,
        [halaqaId]
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
    const byKey = new Map<string, Agreement>();
    const row = (model: string, topic: Topic): Agreement => {
      const key = `${model}\n${topic}`;
      let entry = byKey.get(key);
      if (!entry) {
        entry = {
          model,
          topic,
          bothCheck: 0,
          bothGood: 0,
          falseAlarms: 0,
          misses: 0,
          unclear: 0,
          unheard: 0,
        };
        byKey.set(key, entry);
      }
      return entry;
    };
    for (const r of compared.rows) {
      Object.assign(row(r.model, r.topic), {
        bothCheck: r.both_check,
        bothGood: r.both_good,
        falseAlarms: r.false_alarms,
        misses: r.misses,
        unclear: r.unclear,
      });
    }
    for (const r of unheard.rows) row(r.model, r.topic).unheard = r.unheard;
    return {
      recordings: totals.rows[0]?.recordings ?? 0,
      students: totals.rows[0]?.students ?? 0,
      rows: sortAgreement([...byKey.values()]),
    };
  }
}
