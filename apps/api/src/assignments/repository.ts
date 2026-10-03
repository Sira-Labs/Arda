/**
 * Assignments in Postgres (spec T2, ADR-0014, migration 0004). Who may call what is decided by
 * the routes' policies; the queries here additionally keep every read and write inside one
 * ḥalaqa and, for students, to the assignments meant for them.
 */
import type pg from 'pg';

export const ASSIGNMENT_KINDS = ['learn', 'read', 'recite', 'practise'] as const;
export type AssignmentKind = (typeof ASSIGNMENT_KINDS)[number];

/** Consecutive āyāt of one sūra (the shape of `AyaRange` in @arda/quran). */
export interface AssignmentRange {
  sura: number;
  from: number;
  to: number;
}

export interface NewAssignment {
  halaqaId: string;
  /** One student of the ḥalaqa, or `null` for all of its students. */
  studentId: string | null;
  kind: AssignmentKind;
  range: AssignmentRange | null;
  focusRule: string | null;
  repetitions: number | null;
  note: string | null;
  /** The day it is due, `YYYY-MM-DD`. */
  dueOn: string;
  createdBy: string;
}

interface AssignmentBase {
  id: string;
  kind: AssignmentKind;
  studentId: string | null;
  range: AssignmentRange | null;
  focusRule: string | null;
  repetitions: number | null;
  note: string | null;
  dueOn: string;
  createdAt: string;
}

/** Someone who marked an assignment done. */
export interface Completion {
  userId: string;
  name: string | null;
  email: string | null;
  doneAt: string;
}

/** An assignment as its teacher sees it: for whom, and who is done. */
export interface TeacherAssignment extends AssignmentBase {
  studentName: string | null;
  /** How many students it is for: 1, or the ḥalaqa's active students. */
  targets: number;
  done: Completion[];
}

/** An assignment as the student it is for sees it. */
export interface StudentAssignment extends AssignmentBase {
  halaqaId: string;
  halaqaName: string;
  /** Who gave it (the ḥalaqa's teacher, or an admin). */
  fromName: string | null;
  doneAt: string | null;
}

export interface Page<T> {
  assignments: T[];
  /** Whether older assignments follow; ask again with `before` = the last id. */
  more: boolean;
}

export interface PageRequest {
  /** The id of the last assignment already shown. */
  before?: string;
  limit: number;
}

export interface AssignmentRepository {
  countIn(halaqaId: string): Promise<number>;
  /** Stores it; `null` when `studentId` is not an active student of the ḥalaqa. */
  create(input: NewAssignment): Promise<string | null>;
  /** The ḥalaqa's assignments, latest due day first. */
  forTeacher(halaqaId: string, page: PageRequest): Promise<Page<TeacherAssignment>>;
  /** The assignments in one ḥalaqa meant for this student, latest due day first. */
  forStudent(
    halaqaId: string,
    userId: string,
    page: PageRequest
  ): Promise<Page<StudentAssignment>>;
  /** What the student still has to do, across their active ḥalaqāt, soonest due first. */
  open(userId: string, limit: number): Promise<StudentAssignment[]>;
  remove(halaqaId: string, assignmentId: string): Promise<boolean>;
  /** Marks it done (idempotent); `false` when it is not one of the student's assignments. */
  complete(halaqaId: string, assignmentId: string, userId: string): Promise<boolean>;
  /** Takes the mark back (idempotent); `false` as for `complete`. */
  undo(halaqaId: string, assignmentId: string, userId: string): Promise<boolean>;
}

const iso = (value: Date | string): string => new Date(value).toISOString();

/** Columns every list selects; `due_on` as text, so no time zone can shift the day. */
const COLUMNS = `a.id, a.kind, a.student_id, a.sura, a.aya_from, a.aya_to, a.focus_rule,
  a.repetitions, a.note, to_char(a.due_on, 'YYYY-MM-DD') as due_on, a.created_at`;

/** Older than the cursor, in the order `due_on desc, created_at desc, id desc`. */
const BEFORE = `(a.due_on, a.created_at, a.id) <
  (select due_on, created_at, id from assignments where id = $before and halaqa_id = $1)`;

interface Row {
  id: string;
  kind: AssignmentKind;
  student_id: string | null;
  sura: number | null;
  aya_from: number | null;
  aya_to: number | null;
  focus_rule: string | null;
  repetitions: number | null;
  note: string | null;
  due_on: string;
  created_at: Date;
}

const base = (row: Row): AssignmentBase => ({
  id: row.id,
  kind: row.kind,
  studentId: row.student_id,
  range:
    row.sura === null || row.aya_from === null || row.aya_to === null
      ? null
      : { sura: row.sura, from: row.aya_from, to: row.aya_to },
  focusRule: row.focus_rule,
  repetitions: row.repetitions,
  note: row.note,
  dueOn: row.due_on,
  createdAt: iso(row.created_at),
});

interface StudentRow extends Row {
  halaqa_id: string;
  halaqa_name: string;
  from_name: string | null;
  done_at: Date | null;
}

const forStudentRow = (row: StudentRow): StudentAssignment => ({
  ...base(row),
  halaqaId: row.halaqa_id,
  halaqaName: row.halaqa_name,
  fromName: row.from_name,
  doneAt: row.done_at ? iso(row.done_at) : null,
});

/** `sql` with `$before` bound to the next parameter, or the condition dropped. */
function paged(sql: string, params: unknown[], page: PageRequest): [string, unknown[]] {
  const values = [...params];
  let text = sql;
  if (page.before) {
    values.push(page.before);
    text = text.replace(
      '/*before*/',
      `and ${BEFORE.replace('$before', `$${values.length}`)}`
    );
  } else {
    text = text.replace('/*before*/', '');
  }
  values.push(page.limit + 1);
  return [`${text} limit $${values.length}`, values];
}

const pageOf = <T>(rows: T[], limit: number): Page<T> => ({
  assignments: rows.slice(0, limit),
  more: rows.length > limit,
});

export class PgAssignmentRepository implements AssignmentRepository {
  constructor(private readonly pool: pg.Pool) {}

  async countIn(halaqaId: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      'select count(*) from assignments where halaqa_id = $1',
      [halaqaId]
    );
    return Number(rows[0]?.count ?? 0);
  }

  async create(input: NewAssignment): Promise<string | null> {
    const { rows } = await this.pool.query<{ id: string }>(
      `insert into assignments (halaqa_id, student_id, kind, sura, aya_from, aya_to,
                                focus_rule, repetitions, note, due_on, created_by)
       select $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        where $2::uuid is null or exists (
          select 1 from halaqa_members
           where halaqa_id = $1 and user_id = $2 and halaqa_role = 'student'
             and status = 'active')
       returning id`,
      [
        input.halaqaId,
        input.studentId,
        input.kind,
        input.range?.sura ?? null,
        input.range?.from ?? null,
        input.range?.to ?? null,
        input.focusRule,
        input.repetitions,
        input.note,
        input.dueOn,
        input.createdBy,
      ]
    );
    return rows[0]?.id ?? null;
  }

  async forTeacher(
    halaqaId: string,
    page: PageRequest
  ): Promise<Page<TeacherAssignment>> {
    const [text, values] = paged(
      `select ${COLUMNS}, nullif(btrim(s.name), '') as student_name,
              case when a.student_id is null then
                (select count(*) from halaqa_members m
                  where m.halaqa_id = a.halaqa_id and m.halaqa_role = 'student'
                    and m.status = 'active')
              else 1 end as targets
         from assignments a
         left join users s on s.id = a.student_id
        where a.halaqa_id = $1 /*before*/
        order by a.due_on desc, a.created_at desc, a.id desc`,
      [halaqaId],
      page
    );
    const { rows } = await this.pool.query<
      Row & { student_name: string | null; targets: string }
    >(text, values);
    const shown = rows.slice(0, page.limit);
    const done = await this.completions(shown.map((row) => row.id));
    return pageOf(
      rows.map((row) => ({
        ...base(row),
        studentName: row.student_name,
        targets: Number(row.targets),
        done: done.get(row.id) ?? [],
      })),
      page.limit
    );
  }

  async forStudent(
    halaqaId: string,
    userId: string,
    page: PageRequest
  ): Promise<Page<StudentAssignment>> {
    const [text, values] = paged(
      `select ${COLUMNS}, h.id as halaqa_id, h.name as halaqa_name,
              nullif(btrim(t.name), '') as from_name, c.done_at
         from assignments a
         join halaqat h on h.id = a.halaqa_id
         left join users t on t.id = a.created_by
         left join assignment_completions c
           on c.assignment_id = a.id and c.student_id = $2
        where a.halaqa_id = $1 and (a.student_id is null or a.student_id = $2) /*before*/
        order by a.due_on desc, a.created_at desc, a.id desc`,
      [halaqaId, userId],
      page
    );
    const { rows } = await this.pool.query<StudentRow>(text, values);
    return pageOf(rows.map(forStudentRow), page.limit);
  }

  async open(userId: string, limit: number): Promise<StudentAssignment[]> {
    const { rows } = await this.pool.query<StudentRow>(
      `select ${COLUMNS}, h.id as halaqa_id, h.name as halaqa_name,
              nullif(btrim(t.name), '') as from_name, null as done_at
         from assignments a
         join halaqa_members m
           on m.halaqa_id = a.halaqa_id and m.user_id = $1
          and m.halaqa_role = 'student' and m.status = 'active'
         join halaqat h on h.id = a.halaqa_id
         left join users t on t.id = a.created_by
        where (a.student_id is null or a.student_id = $1)
          and not exists (
            select 1 from assignment_completions c
             where c.assignment_id = a.id and c.student_id = $1)
        order by a.due_on, a.created_at, a.id
        limit $2`,
      [userId, limit]
    );
    return rows.map(forStudentRow);
  }

  async remove(halaqaId: string, assignmentId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'delete from assignments where id = $2 and halaqa_id = $1',
      [halaqaId, assignmentId]
    );
    return (rowCount ?? 0) > 0;
  }

  async complete(
    halaqaId: string,
    assignmentId: string,
    userId: string
  ): Promise<boolean> {
    const { rows } = await this.pool.query<{ found: string }>(
      `with target as (
         select id, halaqa_id from assignments
          where id = $2 and halaqa_id = $1 and (student_id is null or student_id = $3)
       ), marked as (
         insert into assignment_completions (assignment_id, halaqa_id, student_id)
         select id, halaqa_id, $3 from target
         on conflict (assignment_id, student_id) do nothing
         returning 1
       )
       select count(*) as found from target`,
      [halaqaId, assignmentId, userId]
    );
    return Number(rows[0]?.found ?? 0) > 0;
  }

  async undo(halaqaId: string, assignmentId: string, userId: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ found: string }>(
      `with target as (
         select id from assignments
          where id = $2 and halaqa_id = $1 and (student_id is null or student_id = $3)
       ), unmarked as (
         delete from assignment_completions c using target
          where c.assignment_id = target.id and c.student_id = $3
         returning 1
       )
       select count(*) as found from target`,
      [halaqaId, assignmentId, userId]
    );
    return Number(rows[0]?.found ?? 0) > 0;
  }

  /** Who is done with each of the assignments, earliest first. */
  private async completions(ids: string[]): Promise<Map<string, Completion[]>> {
    const byAssignment = new Map<string, Completion[]>();
    if (ids.length === 0) return byAssignment;
    const { rows } = await this.pool.query<{
      assignment_id: string;
      student_id: string;
      name: string | null;
      email: string | null;
      done_at: Date;
    }>(
      `select c.assignment_id, c.student_id, nullif(btrim(u.name), '') as name, u.email,
              c.done_at
         from assignment_completions c join users u on u.id = c.student_id
        where c.assignment_id = any($1::uuid[])
        order by c.done_at, c.student_id`,
      [ids]
    );
    for (const row of rows) {
      const list = byAssignment.get(row.assignment_id) ?? [];
      list.push({
        userId: row.student_id,
        name: row.name,
        email: row.email,
        doneAt: iso(row.done_at),
      });
      byAssignment.set(row.assignment_id, list);
    }
    return byAssignment;
  }
}
