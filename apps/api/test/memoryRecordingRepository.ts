/**
 * An in-memory RecordingRepository for route tests: the same contract as the Postgres one
 * (checked against it in auth.pg.integration.test.ts), reading memberships and assignments
 * from the memory repositories. A student's recordings disappear with their membership, as the
 * foreign keys make them do in Postgres.
 */
import { randomUUID } from 'node:crypto';
import type { MemoryAssignmentRepository } from './memoryAssignmentRepository.js';
import type { MemoryHalaqaRepository } from './memoryHalaqaRepository.js';
import type {
  Audio,
  NewRecording,
  OwnRecording,
  Page,
  PageRequest,
  QueuedRecording,
  RecordingRepository,
  RemarkId,
  SaveOutcome,
  Verdict,
} from '../src/recordings/repository.js';

interface Row extends Omit<NewRecording, 'audio'> {
  id: string;
  data: Buffer;
  createdAt: string;
  seq: number;
  review: {
    verdict: Verdict;
    remark: RemarkId | null;
    note: string | null;
    reviewerId: string;
    reviewedAt: string;
  } | null;
}

export class MemoryRecordingRepository implements RecordingRepository {
  rows: Row[] = [];
  private seq = 0;

  constructor(
    private readonly halaqat: MemoryHalaqaRepository,
    private readonly assignments: MemoryAssignmentRepository,
    private readonly names: Record<string, string> = {}
  ) {}

  /** Rows whose student still belongs to the ḥalaqa. */
  private live(): Row[] {
    return this.rows.filter((r) =>
      this.halaqat.memberRows.get(r.halaqaId)?.has(r.studentId)
    );
  }

  private view(row: Row) {
    return {
      id: row.id,
      halaqaId: row.halaqaId,
      assignmentId: row.assignmentId,
      range: row.range,
      mime: row.mime,
      bytes: row.data.length,
      durationMs: row.durationMs,
      createdAt: row.createdAt,
      review: row.review
        ? {
            verdict: row.review.verdict,
            remark: row.review.remark,
            note: row.review.note,
            reviewerName: this.names[row.review.reviewerId] ?? null,
            reviewedAt: row.review.reviewedAt,
          }
        : null,
    };
  }

  private page<T>(rows: T[], ids: string[], page: PageRequest): Page<T> {
    const start = page.before ? ids.indexOf(page.before) + 1 : 0;
    const slice = rows.slice(start, start + page.limit + 1);
    return { recordings: slice.slice(0, page.limit), more: slice.length > page.limit };
  }

  async save(input: NewRecording, limit: number): Promise<SaveOutcome> {
    const existing = this.rows.find(
      (r) => r.studentId === input.studentId && r.clientId === input.clientId
    );
    if (existing) return { status: 'existing', id: existing.id };
    const member = this.halaqat.memberRows.get(input.halaqaId)?.get(input.studentId);
    if (member?.role !== 'student' || member.status !== 'active') {
      return { status: 'not_member' };
    }
    if (input.assignmentId) {
      const a = this.assignments.rows.find((r) => r.id === input.assignmentId);
      if (
        !a ||
        a.halaqaId !== input.halaqaId ||
        (a.studentId !== null && a.studentId !== input.studentId)
      ) {
        return { status: 'assignment' };
      }
    }
    if (this.live().filter((r) => r.studentId === input.studentId).length >= limit) {
      return { status: 'limit' };
    }
    const { audio, ...rest } = input;
    const id = randomUUID();
    this.rows.push({
      ...rest,
      id,
      data: audio,
      createdAt: new Date(Date.UTC(2026, 9, 6, 10, 0, this.seq)).toISOString(),
      seq: this.seq++,
      review: null,
    });
    return { status: 'created', id };
  }

  async own(studentId: string, page: PageRequest): Promise<Page<OwnRecording>> {
    const rows = this.live()
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => b.seq - a.seq);
    return this.page(
      rows.map((r) => ({
        ...this.view(r),
        halaqaName: this.halaqat.halaqat.get(r.halaqaId)?.name ?? '',
      })),
      rows.map((r) => r.id),
      page
    );
  }

  async queue(halaqaId: string, page: PageRequest): Promise<Page<QueuedRecording>> {
    const rows = this.live()
      .filter((r) => r.halaqaId === halaqaId)
      .sort((a, b) => Number(!!a.review) - Number(!!b.review) || a.seq - b.seq);
    return this.page(
      rows.map((r) => ({
        ...this.view(r),
        studentId: r.studentId,
        studentName: this.names[r.studentId] ?? null,
        studentEmail: null,
      })),
      rows.map((r) => r.id),
      page
    );
  }

  async ownAudio(studentId: string, recordingId: string): Promise<Audio | null> {
    const row = this.live().find(
      (r) => r.id === recordingId && r.studentId === studentId
    );
    return row ? { mime: row.mime, data: row.data } : null;
  }

  async halaqaAudio(halaqaId: string, recordingId: string): Promise<Audio | null> {
    const row = this.live().find((r) => r.id === recordingId && r.halaqaId === halaqaId);
    return row ? { mime: row.mime, data: row.data } : null;
  }

  async review(
    halaqaId: string,
    recordingId: string,
    input: { verdict: Verdict; remark: RemarkId | null; note: string | null },
    reviewerId: string
  ): Promise<boolean> {
    const row = this.live().find((r) => r.id === recordingId && r.halaqaId === halaqaId);
    if (!row) return false;
    row.review = { ...input, reviewerId, reviewedAt: '2026-10-06T12:00:00.000Z' };
    return true;
  }

  async remove(studentId: string, recordingId: string): Promise<boolean> {
    const before = this.rows.length;
    this.rows = this.rows.filter(
      (r) => !(r.id === recordingId && r.studentId === studentId)
    );
    return this.rows.length < before;
  }
}
