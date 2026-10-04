/**
 * An in-memory AssignmentRepository for route tests: the same contract as the Postgres one
 * (checked against it in auth.pg.integration.test.ts), reading memberships from a
 * MemoryHalaqaRepository. A student's own assignments and completions disappear with their
 * membership, as the foreign keys make them do in Postgres.
 */
import { randomUUID } from 'node:crypto';
import type {
  AssignmentRepository,
  Completion,
  NewAssignment,
  Page,
  PageRequest,
  StudentAssignment,
  TeacherAssignment,
} from '../src/assignments/repository.js';
import type { MemoryHalaqaRepository } from './memoryHalaqaRepository.js';

interface Row extends Omit<NewAssignment, 'createdBy'> {
  id: string;
  createdBy: string;
  createdAt: string;
  /** Insertion order, the tie-breaker after the due day. */
  seq: number;
}

export class MemoryAssignmentRepository implements AssignmentRepository {
  rows: Row[] = [];
  /** assignment id → student id → done at */
  doneRows = new Map<string, Map<string, string>>();
  private seq = 0;

  constructor(
    private readonly halaqat: MemoryHalaqaRepository,
    private readonly names: Record<string, string> = {}
  ) {}

  private activeStudent(halaqaId: string, userId: string): boolean {
    const m = this.halaqat.memberRows.get(halaqaId)?.get(userId);
    return m?.role === 'student' && m.status === 'active';
  }

  /** Rows whose student (if any) still belongs to the ḥalaqa. */
  private live(): Row[] {
    return this.rows.filter(
      (r) =>
        this.halaqat.halaqat.has(r.halaqaId) &&
        (r.studentId === null ||
          this.halaqat.memberRows.get(r.halaqaId)?.has(r.studentId))
    );
  }

  private doneBy(row: Row, userId: string): string | null {
    if (!this.halaqat.memberRows.get(row.halaqaId)?.has(userId)) return null;
    return this.doneRows.get(row.id)?.get(userId) ?? null;
  }

  private newestFirst(rows: Row[], page: PageRequest): { rows: Row[]; more: boolean } {
    const sorted = [...rows].sort(
      (a, b) => b.dueOn.localeCompare(a.dueOn) || b.seq - a.seq
    );
    const start = page.before ? sorted.findIndex((r) => r.id === page.before) + 1 : 0;
    const from = page.before && start === 0 ? sorted.length : start;
    const slice = sorted.slice(from, from + page.limit + 1);
    return { rows: slice.slice(0, page.limit), more: slice.length > page.limit };
  }

  private base(r: Row) {
    return {
      id: r.id,
      kind: r.kind,
      studentId: r.studentId,
      range: r.range,
      focusRule: r.focusRule,
      repetitions: r.repetitions,
      note: r.note,
      dueOn: r.dueOn,
      createdAt: r.createdAt,
    };
  }

  private forStudentRow(r: Row, userId: string): StudentAssignment {
    return {
      ...this.base(r),
      halaqaId: r.halaqaId,
      halaqaName: this.halaqat.halaqat.get(r.halaqaId)?.name ?? '',
      fromName: this.names[r.createdBy] ?? null,
      doneAt: this.doneBy(r, userId),
    };
  }

  async countIn(halaqaId: string): Promise<number> {
    return this.rows.filter((r) => r.halaqaId === halaqaId).length;
  }

  async create(input: NewAssignment): Promise<string | null> {
    if (
      input.studentId !== null &&
      !this.activeStudent(input.halaqaId, input.studentId)
    ) {
      return null;
    }
    const id = randomUUID();
    this.rows.push({
      ...input,
      id,
      createdAt: new Date().toISOString(),
      seq: this.seq++,
    });
    return id;
  }

  async forTeacher(
    halaqaId: string,
    page: PageRequest
  ): Promise<Page<TeacherAssignment>> {
    const members = this.halaqat.memberRows.get(halaqaId) ?? new Map();
    const students = [...members.values()].filter(
      (m) => m.role === 'student' && m.status === 'active'
    ).length;
    const { rows, more } = this.newestFirst(
      this.live().filter((r) => r.halaqaId === halaqaId),
      page
    );
    return {
      more,
      assignments: rows.map((r) => {
        const done: Completion[] = [...(this.doneRows.get(r.id) ?? new Map()).entries()]
          .filter(([userId]) => members.has(userId))
          .map(([userId, doneAt]) => ({
            userId,
            name: this.names[userId] ?? null,
            email: null,
            doneAt,
          }));
        return {
          ...this.base(r),
          studentName: r.studentId ? (this.names[r.studentId] ?? null) : null,
          targets: r.studentId ? 1 : students,
          done,
        };
      }),
    };
  }

  async forStudent(
    halaqaId: string,
    userId: string,
    page: PageRequest
  ): Promise<Page<StudentAssignment>> {
    const { rows, more } = this.newestFirst(
      this.live().filter(
        (r) => r.halaqaId === halaqaId && (r.studentId === null || r.studentId === userId)
      ),
      page
    );
    return { more, assignments: rows.map((r) => this.forStudentRow(r, userId)) };
  }

  async open(userId: string, limit: number): Promise<StudentAssignment[]> {
    return this.live()
      .filter(
        (r) =>
          this.activeStudent(r.halaqaId, userId) &&
          (r.studentId === null || r.studentId === userId) &&
          !this.doneBy(r, userId)
      )
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.seq - b.seq)
      .slice(0, limit)
      .map((r) => this.forStudentRow(r, userId));
  }

  async remove(halaqaId: string, assignmentId: string): Promise<boolean> {
    const before = this.rows.length;
    this.rows = this.rows.filter(
      (r) => !(r.id === assignmentId && r.halaqaId === halaqaId)
    );
    this.doneRows.delete(assignmentId);
    return this.rows.length < before;
  }

  private target(
    halaqaId: string,
    assignmentId: string,
    userId: string
  ): Row | undefined {
    return this.live().find(
      (r) =>
        r.id === assignmentId &&
        r.halaqaId === halaqaId &&
        (r.studentId === null || r.studentId === userId)
    );
  }

  async complete(
    halaqaId: string,
    assignmentId: string,
    userId: string
  ): Promise<boolean> {
    const row = this.target(halaqaId, assignmentId, userId);
    if (!row) return false;
    const done = this.doneRows.get(row.id) ?? new Map<string, string>();
    if (!done.has(userId)) done.set(userId, new Date().toISOString());
    this.doneRows.set(row.id, done);
    return true;
  }

  async undo(halaqaId: string, assignmentId: string, userId: string): Promise<boolean> {
    const row = this.target(halaqaId, assignmentId, userId);
    if (!row) return false;
    this.doneRows.get(row.id)?.delete(userId);
    return true;
  }
}
