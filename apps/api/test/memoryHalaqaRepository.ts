/**
 * An in-memory HalaqaRepository for route tests: the same contract as the Postgres one
 * (checked against it in auth.pg.integration.test.ts), without a database.
 */
import { randomUUID } from 'node:crypto';
import type {
  ActiveInvite,
  HalaqaDetail,
  HalaqaRepository,
  HalaqaSummary,
  InvitePreview,
  JoinOutcome,
  Member,
  Membership,
} from '../src/halaqat/repository.js';

interface Row {
  id: string;
  name: string;
  oneToOne: boolean;
  createdBy: string;
  createdAt: string;
}
interface MemberRow extends Membership {
  joinedAt: string;
}
interface InviteRow {
  halaqaId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: Date;
  revoked: boolean;
}

export class MemoryHalaqaRepository implements HalaqaRepository {
  halaqat = new Map<string, Row>();
  memberRows = new Map<string, Map<string, MemberRow>>();
  invites: InviteRow[] = [];
  audit: { action: string; halaqaId: string; actorId: string }[] = [];

  constructor(private readonly names: Record<string, string> = {}) {}

  private rowsOf(halaqaId: string): Map<string, MemberRow> {
    let rows = this.memberRows.get(halaqaId);
    if (!rows) this.memberRows.set(halaqaId, (rows = new Map()));
    return rows;
  }

  async membership(halaqaId: string, userId: string): Promise<Membership | null> {
    const row = this.memberRows.get(halaqaId)?.get(userId);
    return row ? { role: row.role, status: row.status } : null;
  }

  async listFor(userId: string): Promise<HalaqaSummary[]> {
    return [...this.halaqat.values()].flatMap((h) => {
      const me = this.memberRows.get(h.id)?.get(userId);
      if (!me) return [];
      const students = [...this.rowsOf(h.id).values()].filter(
        (m) => m.role === 'student'
      );
      return [
        {
          id: h.id,
          name: h.name,
          oneToOne: h.oneToOne,
          role: me.role,
          status: me.status,
          teacherName: this.names[h.createdBy] ?? null,
          students: students.filter((m) => m.status === 'active').length,
          pending:
            me.role === 'teacher'
              ? students.filter((m) => m.status === 'pending').length
              : null,
        },
      ];
    });
  }

  async countCreatedBy(userId: string): Promise<number> {
    return [...this.halaqat.values()].filter((h) => h.createdBy === userId).length;
  }

  async create(input: {
    name: string;
    oneToOne: boolean;
    teacherId: string;
  }): Promise<string> {
    const id = randomUUID();
    const at = new Date().toISOString();
    this.halaqat.set(id, { id, ...input, createdBy: input.teacherId, createdAt: at });
    this.rowsOf(id).set(input.teacherId, {
      role: 'teacher',
      status: 'active',
      joinedAt: at,
    });
    return id;
  }

  /** Test setup: a member with a given role and status. */
  addMember(halaqaId: string, userId: string, membership: Membership): void {
    this.rowsOf(halaqaId).set(userId, {
      ...membership,
      joinedAt: new Date().toISOString(),
    });
  }

  async find(halaqaId: string): Promise<HalaqaDetail | null> {
    const h = this.halaqat.get(halaqaId);
    return h
      ? {
          id: h.id,
          name: h.name,
          oneToOne: h.oneToOne,
          teacherName: this.names[h.createdBy] ?? null,
          createdAt: h.createdAt,
        }
      : null;
  }

  async members(halaqaId: string): Promise<Member[]> {
    return [...this.rowsOf(halaqaId).entries()].map(([userId, m]) => ({
      userId,
      name: this.names[userId] ?? null,
      email: `${userId}@example.org`,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
    }));
  }

  async activeInvite(halaqaId: string, now: Date): Promise<ActiveInvite | null> {
    const invite = this.invites.find(
      (i) => i.halaqaId === halaqaId && !i.revoked && i.expiresAt > now
    );
    return invite
      ? { createdAt: invite.createdAt, expiresAt: invite.expiresAt.toISOString() }
      : null;
  }

  async createInvite(input: {
    halaqaId: string;
    tokenHash: string;
    actorId: string;
    expiresAt: Date;
  }): Promise<void> {
    for (const invite of this.invites)
      if (invite.halaqaId === input.halaqaId) invite.revoked = true;
    this.invites.push({
      halaqaId: input.halaqaId,
      tokenHash: input.tokenHash,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
      revoked: false,
    });
    this.audit.push({
      action: 'halaqa.invite_created',
      halaqaId: input.halaqaId,
      actorId: input.actorId,
    });
  }

  async revokeInvites(halaqaId: string, actorId: string): Promise<number> {
    const open = this.invites.filter((i) => i.halaqaId === halaqaId && !i.revoked);
    for (const invite of open) invite.revoked = true;
    if (open.length)
      this.audit.push({ action: 'halaqa.invites_revoked', halaqaId, actorId });
    return open.length;
  }

  async findInvite(tokenHash: string, now: Date): Promise<InvitePreview | null> {
    const invite = this.invites.find(
      (i) => i.tokenHash === tokenHash && !i.revoked && i.expiresAt > now
    );
    const h = invite && this.halaqat.get(invite.halaqaId);
    return h
      ? {
          halaqaId: h.id,
          name: h.name,
          oneToOne: h.oneToOne,
          teacherName: this.names[h.createdBy] ?? null,
        }
      : null;
  }

  async join(halaqaId: string, userId: string): Promise<JoinOutcome> {
    const h = this.halaqat.get(halaqaId);
    if (!h) return { kind: 'gone' };
    const rows = this.rowsOf(halaqaId);
    const existing = rows.get(userId);
    if (existing) return { kind: 'member', status: existing.status };
    if (h.oneToOne && [...rows.values()].some((m) => m.role === 'student'))
      return { kind: 'full' };
    rows.set(userId, {
      role: 'student',
      status: 'pending',
      joinedAt: new Date().toISOString(),
    });
    return { kind: 'joined', status: 'pending' };
  }

  async approve(halaqaId: string, userId: string, actorId: string): Promise<boolean> {
    const row = this.memberRows.get(halaqaId)?.get(userId);
    if (!row || row.role !== 'student' || row.status !== 'pending') return false;
    row.status = 'active';
    this.audit.push({ action: 'halaqa.member_approved', halaqaId, actorId });
    return true;
  }

  async remove(halaqaId: string, userId: string, actorId: string): Promise<boolean> {
    const rows = this.memberRows.get(halaqaId);
    if (rows?.get(userId)?.role !== 'student') return false;
    rows.delete(userId);
    this.audit.push({ action: 'halaqa.member_removed', halaqaId, actorId });
    return true;
  }

  async leave(halaqaId: string, userId: string): Promise<boolean> {
    const rows = this.memberRows.get(halaqaId);
    if (rows?.get(userId)?.role !== 'student') return false;
    rows.delete(userId);
    return true;
  }
}
