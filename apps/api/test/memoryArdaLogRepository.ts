/**
 * An in-memory ArdaLogRepository for route tests: the same contract as the Postgres one
 * (checked against it in auth.pg.integration.test.ts). A student's entries disappear with their
 * membership, as the foreign key makes them do in Postgres; the recording repository writes
 * answers here as the Postgres one does in its transaction.
 */
import { randomUUID } from 'node:crypto';
import type { MemoryHalaqaRepository } from './memoryHalaqaRepository.js';
import type {
  AddOutcome,
  AnswerEntry,
  ArdaEntry,
  ArdaLogRepository,
  EntryPage,
  EntryRequest,
  NewEntry,
  OwnSuraSummary,
  StudentSuraSummary,
  SuraSummary,
} from '../src/ardaLog/repository.js';

interface Row extends Omit<ArdaEntry, 'studentName' | 'writtenByName'> {
  writtenBy: string | null;
  seq: number;
}

/** Newest recitation first, then the latest written. */
const newestFirst = (a: Row, b: Row) =>
  b.recitedOn.localeCompare(a.recitedOn) || b.seq - a.seq;

export class MemoryArdaLogRepository implements ArdaLogRepository {
  rows: Row[] = [];
  private seq = 0;

  constructor(
    private readonly halaqat: MemoryHalaqaRepository,
    private readonly names: Record<string, string> = {}
  ) {}

  /** Rows whose student still belongs to the ḥalaqa. */
  private live(): Row[] {
    return this.rows.filter((r) =>
      this.halaqat.memberRows.get(r.halaqaId)?.has(r.studentId)
    );
  }

  private view(row: Row): ArdaEntry {
    const { writtenBy, seq: _seq, ...rest } = row;
    return {
      ...rest,
      studentName: this.names[row.studentId] ?? null,
      writtenByName: writtenBy ? (this.names[writtenBy] ?? null) : null,
    };
  }

  /** What `PgRecordingRepository.review` writes with an answer. */
  recordAnswer(entry: AnswerEntry): void {
    const existing = this.rows.find((r) => r.recordingId === entry.recordingId);
    const fields = {
      recitedOn: entry.recitedOn,
      verdict: entry.verdict,
      remark: entry.remark,
      note: entry.note,
      marks: [...entry.marks],
      writtenBy: entry.writtenBy,
    };
    if (existing) {
      Object.assign(existing, fields);
      return;
    }
    this.rows.push({
      ...fields,
      id: randomUUID(),
      halaqaId: entry.halaqaId,
      studentId: entry.studentId,
      range: entry.range,
      source: 'recording',
      recordingId: entry.recordingId,
      createdAt: new Date(Date.UTC(2026, 9, 6, 12, 0, this.seq)).toISOString(),
      seq: this.seq++,
    });
  }

  /** A deleted recording leaves its entry (`on delete set null`). */
  forgetRecording(recordingId: string): void {
    for (const row of this.rows) {
      if (row.recordingId === recordingId) row.recordingId = null;
    }
  }

  async add(entry: NewEntry, limit: number): Promise<AddOutcome> {
    const member = this.halaqat.memberRows.get(entry.halaqaId)?.get(entry.studentId);
    if (member?.role !== 'student' || member.status !== 'active') {
      return { status: 'not_member' };
    }
    const written = this.rows.filter(
      (r) =>
        r.halaqaId === entry.halaqaId &&
        r.studentId === entry.studentId &&
        r.source === 'in_person'
    );
    if (written.length >= limit) return { status: 'limit' };
    const id = randomUUID();
    this.rows.push({
      id,
      halaqaId: entry.halaqaId,
      studentId: entry.studentId,
      range: entry.range,
      recitedOn: entry.recitedOn,
      verdict: entry.verdict,
      remark: entry.remark,
      note: entry.note,
      marks: [],
      source: 'in_person',
      recordingId: null,
      writtenBy: entry.writtenBy,
      createdAt: new Date(Date.UTC(2026, 9, 6, 12, 0, this.seq)).toISOString(),
      seq: this.seq++,
    });
    return { status: 'added', id };
  }

  async entries(halaqaId: string, page: EntryRequest): Promise<EntryPage> {
    const rows = this.live()
      .filter(
        (r) =>
          r.halaqaId === halaqaId && (!page.studentId || r.studentId === page.studentId)
      )
      .sort(newestFirst);
    const start = page.before ? rows.findIndex((r) => r.id === page.before) + 1 : 0;
    const slice = rows.slice(start, start + page.limit + 1);
    return {
      entries: slice.slice(0, page.limit).map((r) => this.view(r)),
      more: slice.length > page.limit,
    };
  }

  /** Per key: how often, the last day, and the latest verdict. */
  private summarise(rows: Row[], key: (row: Row) => string) {
    const groups = new Map<string, Row[]>();
    for (const row of rows) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
    return [...groups.values()].map((group) => {
      const latest = [...group].sort(newestFirst)[0]!;
      const summary: SuraSummary = {
        sura: latest.range.sura,
        times: group.length,
        lastOn: latest.recitedOn,
        lastVerdict: latest.verdict,
      };
      return { latest, summary };
    });
  }

  async summary(halaqaId: string): Promise<StudentSuraSummary[]> {
    return this.summarise(
      this.live().filter((r) => r.halaqaId === halaqaId),
      (r) => `${r.studentId}:${r.range.sura}`
    )
      .map(({ latest, summary }) => ({
        ...summary,
        studentId: latest.studentId,
        studentName: this.names[latest.studentId] ?? null,
      }))
      .sort((a, b) => a.studentId.localeCompare(b.studentId) || a.sura - b.sura);
  }

  async ownSummary(studentId: string): Promise<OwnSuraSummary[]> {
    return this.summarise(
      this.live().filter((r) => r.studentId === studentId),
      (r) => `${r.halaqaId}:${r.range.sura}`
    )
      .map(({ latest, summary }) => ({
        ...summary,
        halaqaId: latest.halaqaId,
        halaqaName: this.halaqat.halaqat.get(latest.halaqaId)?.name ?? '',
      }))
      .sort((a, b) => a.halaqaId.localeCompare(b.halaqaId) || a.sura - b.sura);
  }

  async remove(halaqaId: string, id: string): Promise<boolean> {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !(r.id === id && r.halaqaId === halaqaId));
    return this.rows.length < before;
  }
}
