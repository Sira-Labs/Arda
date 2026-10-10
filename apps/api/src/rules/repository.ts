/**
 * Rule by rule (spec T5, ADR-0026): which rules the active students of a ḥalaqa still struggle
 * with, from their own practice (review cards on the account, ADR-0022: a card still in box 1
 * or 2 is a mistake not yet mastered) and from what the teachers said of their recitations in
 * the ʿarḍ log (ADR-0025): quick remarks with `again`, and marked words he named a rule for.
 * Only counts leave the database: no answers, no prompts, no words.
 */
import type pg from 'pg';
import type { RemarkId } from '../recordings/repository.js';

/**
 * The topics a struggle is counted on: the rule cards of the path (apps/web/src/content/units.ts;
 * a review card's `answer`), and what the quick remarks speak of besides: madd and the letters'
 * points of articulation.
 */
export const RULE_CARDS = [
  'izhar',
  'idgham',
  'iqlab',
  'ikhfa',
  'ghunna',
  'ikhfa-shafawi',
  'idgham-shafawi',
  'izhar-shafawi',
  'qalqala',
] as const;
export const TOPICS = [...RULE_CARDS, 'madd', 'makhraj'] as const;
export type Topic = (typeof TOPICS)[number];

/** What each quick remark is about; `good` is about nothing to work on. */
export const REMARK_TOPIC: Readonly<Record<RemarkId, Topic | null>> = {
  ghunnaShort: 'ghunna',
  ghunnaLong: 'ghunna',
  nunTooClear: 'ikhfa',
  qalqalaMissing: 'qalqala',
  maddShort: 'madd',
  sinVoiced: 'makhraj',
  zayVoiceless: 'makhraj',
  raRolled: 'makhraj',
  good: null,
};

/** Practice up to box 2 is a mistake not yet mastered (ADR-0021: boxes 1–5). */
export const OPEN_BOX = 2;

/** One student and one topic they still struggle with. */
export interface Struggle {
  studentId: string;
  studentName: string | null;
  topic: Topic;
  /** Practice cards on this rule still in box 1 or 2. */
  openCards: number;
  /** How often those and the other cards on it were missed again. */
  lapses: number;
  /** The teachers' remarks on it since `since`. */
  remarks: number;
  /** The words they marked for it since `since`. */
  marks: number;
  /** The day of the last remark or mark. */
  lastNotedOn: string | null;
}

export interface RuleRepository {
  /** The ḥalaqa's active students and the topics they struggle with; remarks from `since`. */
  struggles(halaqaId: string, since: string): Promise<Struggle[]>;
}

export class PgRuleRepository implements RuleRepository {
  constructor(private readonly pool: pg.Pool) {}

  async struggles(halaqaId: string, since: string): Promise<Struggle[]> {
    const [practice, remarks, marks] = await Promise.all([
      this.pool.query<{
        student_id: string;
        student_name: string | null;
        topic: Topic;
        open_cards: number;
        lapses: number;
      }>(
        `select m.user_id as student_id, nullif(btrim(u.name), '') as student_name,
                c.answer as topic,
                count(*) filter (where c.box <= $3)::int as open_cards,
                coalesce(sum(c.lapses), 0)::int as lapses
           from halaqa_members m
           join users u on u.id = m.user_id
           join review_cards c on c.user_id = m.user_id
          where m.halaqa_id = $1 and m.halaqa_role = 'student' and m.status = 'active'
            and c.answer = any($2::text[])
          group by m.user_id, u.name, c.answer
         having count(*) filter (where c.box <= $3) > 0`,
        [halaqaId, RULE_CARDS, OPEN_BOX]
      ),
      this.pool.query<{
        student_id: string;
        student_name: string | null;
        remark: RemarkId;
        n: number;
        last_on: string;
      }>(
        `select l.student_id, nullif(btrim(u.name), '') as student_name, l.remark,
                count(*)::int as n, to_char(max(l.recited_on), 'YYYY-MM-DD') as last_on
           from arda_log l
           join users u on u.id = l.student_id
           -- The log outlives the membership (ADR-0025 update); the view is of active students.
           join halaqa_members hm
             on hm.halaqa_id = l.halaqa_id and hm.user_id = l.student_id
            and hm.halaqa_role = 'student' and hm.status = 'active'
          where l.halaqa_id = $1 and l.verdict = 'again' and l.remark is not null
            and l.recited_on >= $2::date
          group by l.student_id, u.name, l.remark`,
        [halaqaId, since]
      ),
      this.pool.query<{
        student_id: string;
        student_name: string | null;
        topic: Topic;
        n: number;
        last_on: string;
      }>(
        `select l.student_id, nullif(btrim(u.name), '') as student_name,
                m.mark->>'topic' as topic, count(*)::int as n,
                to_char(max(l.recited_on), 'YYYY-MM-DD') as last_on
           from arda_log l
           join users u on u.id = l.student_id
           -- The log outlives the membership (ADR-0025 update); the view is of active students.
           join halaqa_members hm
             on hm.halaqa_id = l.halaqa_id and hm.user_id = l.student_id
            and hm.halaqa_role = 'student' and hm.status = 'active'
           cross join lateral jsonb_array_elements(l.marks) as m(mark)
          where l.halaqa_id = $1 and l.recited_on >= $2::date
            and m.mark->>'topic' = any($3::text[])
          group by l.student_id, u.name, m.mark->>'topic'`,
        [halaqaId, since, TOPICS]
      ),
    ]);
    const byKey = new Map<string, Struggle>();
    const entry = (studentId: string, studentName: string | null, topic: Topic) => {
      const key = `${studentId} ${topic}`;
      let struggle = byKey.get(key);
      if (!struggle) {
        struggle = {
          studentId,
          studentName,
          topic,
          openCards: 0,
          lapses: 0,
          remarks: 0,
          marks: 0,
          lastNotedOn: null,
        };
        byKey.set(key, struggle);
      }
      return struggle;
    };
    for (const row of practice.rows) {
      const struggle = entry(row.student_id, row.student_name, row.topic);
      struggle.openCards = row.open_cards;
      struggle.lapses = row.lapses;
    }
    const noted = (struggle: Struggle, day: string) => {
      if (!struggle.lastNotedOn || day > struggle.lastNotedOn) struggle.lastNotedOn = day;
    };
    for (const row of remarks.rows) {
      const topic = REMARK_TOPIC[row.remark];
      if (!topic) continue;
      const struggle = entry(row.student_id, row.student_name, topic);
      struggle.remarks += row.n;
      noted(struggle, row.last_on);
    }
    for (const row of marks.rows) {
      const struggle = entry(row.student_id, row.student_name, row.topic);
      struggle.marks += row.n;
      noted(struggle, row.last_on);
    }
    return sortStruggles([...byKey.values()]);
  }
}

/** The heaviest first: open mistakes, remarks and marks together, then topic and student. */
export function sortStruggles(struggles: Struggle[]): Struggle[] {
  const weight = (s: Struggle) => s.openCards + s.remarks + s.marks;
  return struggles.sort(
    (a, b) =>
      weight(b) - weight(a) ||
      TOPICS.indexOf(a.topic) - TOPICS.indexOf(b.topic) ||
      a.studentId.localeCompare(b.studentId)
  );
}
