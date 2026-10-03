/**
 * GDPR self-service (story A5): everything the server keeps about a person, as one export, and
 * deleting the account with everything that belongs to it.
 *
 * Deletion relies on the foreign keys (on delete cascade: sessions, accounts, passkeys, second
 * factor). The audit log keeps its rows with the actor set to null: a record of who changed
 * what, without the person. Each later feature (ḥalaqāt, recitations, progress) adds its
 * tables to the export here and to the cascade in its migration.
 */
import type pg from 'pg';
import { writeAudit } from '../audit/log.js';

export interface AccountExport {
  exportedAt: string;
  profile: Record<string, unknown>;
  secondFactorEnabled: boolean;
  /** Devices, without session tokens. */
  sessions: Record<string, unknown>[];
  /** Passkeys without their public keys and credential ids. */
  passkeys: Record<string, unknown>[];
  /** Remarks this person had translated (ADR-0020), with their translations. */
  translations: Record<string, unknown>[];
  /** Ḥalaqāt this person belongs to, with their role and status (spec T1). */
  halaqat: Record<string, unknown>[];
  /** Privileged changes made by or to this person. */
  auditLog: Record<string, unknown>[];
}

export interface PrivacyRepository {
  export(userId: string): Promise<AccountExport>;
  /** Deletes the account and its data; the deletion itself is audited without the person. */
  delete(userId: string, ipAddress: string | null): Promise<void>;
}

export class PgPrivacyRepository implements PrivacyRepository {
  constructor(private readonly pool: pg.Pool) {}

  async export(userId: string): Promise<AccountExport> {
    const [profile, totp, sessions, passkeys, translations, halaqat, audit] =
      await Promise.all([
        this.pool.query(
          `select id, email, email_verified, name, role, language, time_zone, disabled_at,
                created_at, updated_at
           from users where id = $1`,
          [userId]
        ),
        this.pool.query('select enabled_at from user_totp where user_id = $1', [userId]),
        this.pool.query(
          `select id, created_at, updated_at, expires_at, ip_address, user_agent
           from sessions where user_id = $1 order by created_at`,
          [userId]
        ),
        this.pool.query(
          `select id, name, device_type, backed_up, aaguid, created_at
           from passkeys where user_id = $1 order by created_at`,
          [userId]
        ),
        this.pool.query(
          `select source_language, target_language, source_text, text, model, created_at
           from translations where created_by = $1 order by id`,
          [userId]
        ),
        this.pool.query(
          `select h.id, h.name, h.one_to_one, h.created_by = $1 as opened_by_you,
                m.halaqa_role, m.status, m.joined_at, m.approved_at
           from halaqa_members m join halaqat h on h.id = m.halaqa_id
          where m.user_id = $1 order by m.joined_at`,
          [userId]
        ),
        this.pool.query(
          `select id, actor_id, action, target_type, target_id, details, created_at
           from audit_log
          where actor_id = $1
             or (target_type = 'user' and target_id = $1::text)
             -- A teacher approving or removing this person in a ḥalaqa.
             or (target_type = 'halaqa' and details->>'userId' = $1::text)
          order by id`,
          [userId]
        ),
      ]);
    return {
      exportedAt: new Date().toISOString(),
      profile: profile.rows[0] ?? {},
      secondFactorEnabled: Boolean(totp.rows[0]?.enabled_at),
      sessions: sessions.rows,
      passkeys: passkeys.rows,
      translations: translations.rows,
      halaqat: halaqat.rows,
      auditLog: audit.rows,
    };
  }

  async delete(userId: string, ipAddress: string | null): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('delete from users where id = $1', [userId]);
      await writeAudit(client, {
        actorId: null,
        action: 'account.deleted',
        targetType: 'user',
        targetId: userId,
        ipAddress,
      });
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}
