/**
 * Ḥalaqāt, members and invites in Postgres (ADR-0005, migration 0003). Membership changes a
 * teacher makes (approve, remove, a new invite) are audit-logged in the same transaction.
 */
import type pg from 'pg';
import { writeAudit } from '../audit/log.js';

export type HalaqaRole = 'teacher' | 'student';
export type MemberStatus = 'pending' | 'active';

export interface Membership {
  role: HalaqaRole;
  status: MemberStatus;
}

/** A ḥalaqa as it appears in someone's list. */
export interface HalaqaSummary {
  id: string;
  name: string;
  oneToOne: boolean;
  role: HalaqaRole;
  status: MemberStatus;
  teacherName: string | null;
  /** Active students; the teacher also sees how many wait for approval. */
  students: number;
  pending: number | null;
}

export interface HalaqaDetail {
  id: string;
  name: string;
  oneToOne: boolean;
  teacherName: string | null;
  createdAt: string;
}

export interface Member {
  userId: string;
  name: string | null;
  email: string | null;
  role: HalaqaRole;
  status: MemberStatus;
  joinedAt: string;
}

export interface InvitePreview {
  halaqaId: string;
  name: string;
  oneToOne: boolean;
  teacherName: string | null;
}

export interface ActiveInvite {
  createdAt: string;
  expiresAt: string;
}

/** The ḥalaqa a join led to. */
export interface JoinedHalaqa {
  id: string;
  name: string;
}

export type JoinOutcome =
  | { kind: 'joined'; halaqa: JoinedHalaqa; status: MemberStatus }
  | { kind: 'member'; halaqa: JoinedHalaqa; status: MemberStatus }
  | { kind: 'full' }
  /** No valid invite with this hash: unknown, expired, revoked or replaced. */
  | { kind: 'invalid' };

export interface HalaqaRepository {
  membership(halaqaId: string, userId: string): Promise<Membership | null>;
  listFor(userId: string): Promise<HalaqaSummary[]>;
  countCreatedBy(userId: string): Promise<number>;
  /** Opens a ḥalaqa with its teacher as the first, active member. */
  create(input: { name: string; oneToOne: boolean; teacherId: string }): Promise<string>;
  find(halaqaId: string): Promise<HalaqaDetail | null>;
  members(halaqaId: string): Promise<Member[]>;
  activeInvite(halaqaId: string, now: Date): Promise<ActiveInvite | null>;
  /** Stores a new invite and revokes the previous ones. */
  createInvite(input: {
    halaqaId: string;
    tokenHash: string;
    actorId: string;
    expiresAt: Date;
  }): Promise<void>;
  revokeInvites(halaqaId: string, actorId: string): Promise<number>;
  /** The ḥalaqa a valid (unexpired, unrevoked) invite leads to. */
  findInvite(tokenHash: string, now: Date): Promise<InvitePreview | null>;
  /**
   * Joins the ḥalaqa a valid invite leads to, as a pending student. The invite is checked in
   * the same transaction as the insert, so a link withdrawn or expiring meanwhile admits
   * nobody; one-to-one ḥalaqāt take a single student.
   */
  join(tokenHash: string, userId: string, now: Date): Promise<JoinOutcome>;
  approve(halaqaId: string, userId: string, actorId: string): Promise<boolean>;
  /** Removes a student (pending or active); the teacher's own row cannot be removed. */
  remove(halaqaId: string, userId: string, actorId: string): Promise<boolean>;
  /** A student leaves on their own. */
  leave(halaqaId: string, userId: string): Promise<boolean>;
}

const iso = (value: Date | string): string => new Date(value).toISOString();

export class PgHalaqaRepository implements HalaqaRepository {
  constructor(private readonly pool: pg.Pool) {}

  async membership(halaqaId: string, userId: string): Promise<Membership | null> {
    const { rows } = await this.pool.query<Membership>(
      `select halaqa_role as role, status from halaqa_members
        where halaqa_id = $1 and user_id = $2`,
      [halaqaId, userId]
    );
    return rows[0] ?? null;
  }

  async listFor(userId: string): Promise<HalaqaSummary[]> {
    const { rows } = await this.pool.query(
      `select h.id, h.name, h.one_to_one, m.halaqa_role, m.status, nullif(btrim(t.name), '') as teacher_name,
              (select count(*) from halaqa_members s
                where s.halaqa_id = h.id and s.halaqa_role = 'student' and s.status = 'active')
                as students,
              (select count(*) from halaqa_members p
                where p.halaqa_id = h.id and p.halaqa_role = 'student' and p.status = 'pending')
                as pending
         from halaqa_members m
         join halaqat h on h.id = m.halaqa_id
         left join users t on t.id = h.created_by
        where m.user_id = $1
        order by h.created_at, h.id`,
      [userId]
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      oneToOne: row.one_to_one,
      role: row.halaqa_role,
      status: row.status,
      teacherName: row.teacher_name,
      students: Number(row.students),
      // Who waits for approval is the teacher's business.
      pending: row.halaqa_role === 'teacher' ? Number(row.pending) : null,
    }));
  }

  async countCreatedBy(userId: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      'select count(*) from halaqat where created_by = $1',
      [userId]
    );
    return Number(rows[0]?.count ?? 0);
  }

  async create(input: {
    name: string;
    oneToOne: boolean;
    teacherId: string;
  }): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const { rows } = await client.query<{ id: string }>(
        `insert into halaqat (name, one_to_one, created_by) values ($1, $2, $3) returning id`,
        [input.name, input.oneToOne, input.teacherId]
      );
      const id = rows[0]!.id;
      await client.query(
        `insert into halaqa_members (halaqa_id, user_id, halaqa_role, status, approved_at)
         values ($1, $2, 'teacher', 'active', now())`,
        [id, input.teacherId]
      );
      await client.query('commit');
      return id;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async find(halaqaId: string): Promise<HalaqaDetail | null> {
    const { rows } = await this.pool.query(
      `select h.id, h.name, h.one_to_one, h.created_at, nullif(btrim(t.name), '') as teacher_name
         from halaqat h left join users t on t.id = h.created_by
        where h.id = $1`,
      [halaqaId]
    );
    const row = rows[0];
    return row
      ? {
          id: row.id,
          name: row.name,
          oneToOne: row.one_to_one,
          teacherName: row.teacher_name,
          createdAt: iso(row.created_at),
        }
      : null;
  }

  async members(halaqaId: string): Promise<Member[]> {
    const { rows } = await this.pool.query(
      `select m.user_id, nullif(btrim(u.name), '') as name, u.email, m.halaqa_role, m.status, m.joined_at
         from halaqa_members m join users u on u.id = m.user_id
        where m.halaqa_id = $1
        order by m.halaqa_role desc, m.status, m.joined_at`,
      [halaqaId]
    );
    return rows.map((row) => ({
      userId: row.user_id,
      name: row.name,
      email: row.email,
      role: row.halaqa_role,
      status: row.status,
      joinedAt: iso(row.joined_at),
    }));
  }

  async activeInvite(halaqaId: string, now: Date): Promise<ActiveInvite | null> {
    const { rows } = await this.pool.query(
      `select created_at, expires_at from halaqa_invites
        where halaqa_id = $1 and revoked_at is null and expires_at > $2
        order by created_at desc limit 1`,
      [halaqaId, now]
    );
    const row = rows[0];
    return row
      ? { createdAt: iso(row.created_at), expiresAt: iso(row.expires_at) }
      : null;
  }

  async createInvite(input: {
    halaqaId: string;
    tokenHash: string;
    actorId: string;
    expiresAt: Date;
  }): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query(
        `update halaqa_invites set revoked_at = now()
          where halaqa_id = $1 and revoked_at is null`,
        [input.halaqaId]
      );
      await client.query(
        `insert into halaqa_invites (halaqa_id, token_hash, created_by, expires_at)
         values ($1, $2, $3, $4)`,
        [input.halaqaId, input.tokenHash, input.actorId, input.expiresAt]
      );
      await writeAudit(client, {
        actorId: input.actorId,
        action: 'halaqa.invite_created',
        targetType: 'halaqa',
        targetId: input.halaqaId,
        details: { expiresAt: input.expiresAt.toISOString() },
      });
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeInvites(halaqaId: string, actorId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const { rowCount } = await client.query(
        `update halaqa_invites set revoked_at = now()
          where halaqa_id = $1 and revoked_at is null`,
        [halaqaId]
      );
      if (rowCount) {
        await writeAudit(client, {
          actorId,
          action: 'halaqa.invites_revoked',
          targetType: 'halaqa',
          targetId: halaqaId,
          details: { revoked: rowCount },
        });
      }
      await client.query('commit');
      return rowCount ?? 0;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async findInvite(tokenHash: string, now: Date): Promise<InvitePreview | null> {
    const { rows } = await this.pool.query(
      `select h.id, h.name, h.one_to_one, nullif(btrim(t.name), '') as teacher_name
         from halaqa_invites i
         join halaqat h on h.id = i.halaqa_id
         left join users t on t.id = h.created_by
        where i.token_hash = $1 and i.revoked_at is null and i.expires_at > $2`,
      [tokenHash, now]
    );
    const row = rows[0];
    return row
      ? {
          halaqaId: row.id,
          name: row.name,
          oneToOne: row.one_to_one,
          teacherName: row.teacher_name,
        }
      : null;
  }

  async join(tokenHash: string, userId: string, now: Date): Promise<JoinOutcome> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      // Locks the invite (a revocation waits for this join, or this join sees it) and the
      // ḥalaqa (joins queue up, so two students cannot both take a one-to-one place).
      const { rows: found } = await client.query<{
        id: string;
        name: string;
        one_to_one: boolean;
      }>(
        `select h.id, h.name, h.one_to_one
           from halaqa_invites i join halaqat h on h.id = i.halaqa_id
          where i.token_hash = $1 and i.revoked_at is null and i.expires_at > $2
          for update of i, h`,
        [tokenHash, now]
      );
      const halaqa = found[0];
      if (!halaqa) {
        await client.query('commit');
        return { kind: 'invalid' };
      }
      const joined = { id: halaqa.id, name: halaqa.name };
      const { rows: existing } = await client.query<{ status: MemberStatus }>(
        'select status from halaqa_members where halaqa_id = $1 and user_id = $2',
        [halaqa.id, userId]
      );
      if (existing[0]) {
        await client.query('commit');
        return { kind: 'member', halaqa: joined, status: existing[0].status };
      }
      if (halaqa.one_to_one) {
        const { rows } = await client.query<{ count: string }>(
          `select count(*) from halaqa_members
            where halaqa_id = $1 and halaqa_role = 'student'`,
          [halaqa.id]
        );
        if (Number(rows[0]?.count ?? 0) > 0) {
          await client.query('commit');
          return { kind: 'full' };
        }
      }
      await client.query(
        `insert into halaqa_members (halaqa_id, user_id, halaqa_role, status)
         values ($1, $2, 'student', 'pending')`,
        [halaqa.id, userId]
      );
      await client.query('commit');
      return { kind: 'joined', halaqa: joined, status: 'pending' };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async approve(halaqaId: string, userId: string, actorId: string): Promise<boolean> {
    return this.changeStudent(
      halaqaId,
      userId,
      actorId,
      'halaqa.member_approved',
      (client) =>
        client.query(
          `update halaqa_members set status = 'active', approved_at = now()
          where halaqa_id = $1 and user_id = $2 and halaqa_role = 'student'
            and status = 'pending'`,
          [halaqaId, userId]
        )
    );
  }

  async remove(halaqaId: string, userId: string, actorId: string): Promise<boolean> {
    return this.changeStudent(
      halaqaId,
      userId,
      actorId,
      'halaqa.member_removed',
      (client) =>
        client.query(
          `delete from halaqa_members
          where halaqa_id = $1 and user_id = $2 and halaqa_role = 'student'`,
          [halaqaId, userId]
        )
    );
  }

  async leave(halaqaId: string, userId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `delete from halaqa_members
        where halaqa_id = $1 and user_id = $2 and halaqa_role = 'student'`,
      [halaqaId, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  /** A teacher's change to one student's membership, audited in the same transaction. */
  private async changeStudent(
    halaqaId: string,
    userId: string,
    actorId: string,
    action: string,
    change: (client: pg.PoolClient) => Promise<pg.QueryResult>
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const { rowCount } = await change(client);
      if (rowCount) {
        await writeAudit(client, {
          actorId,
          action,
          targetType: 'halaqa',
          targetId: halaqaId,
          details: { userId },
        });
      }
      await client.query('commit');
      return (rowCount ?? 0) > 0;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}
