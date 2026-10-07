/**
 * GDPR self-service (story A5): everything the server keeps about a person, as one export, and
 * deleting the account with everything that belongs to it.
 *
 * Deletion relies on the foreign keys (on delete cascade: sessions, accounts, passkeys, second
 * factor). The audit log keeps its rows with the actor set to null: a record of who changed
 * what, without the person. Each feature (ḥalaqāt, recitations, progress) adds its
 * tables to the export here and to the cascade in its migration.
 */
import type pg from 'pg';
import { writeAudit } from '../audit/log.js';
import {
  readActivity,
  readProgress,
  type Progress,
  type StoredEvent,
} from '../progress/repository.js';

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
  /** Assignments this person gave, or was given, and when they marked them done (T2). */
  assignments: Record<string, unknown>[];
  /**
   * Recitations this person sent (their sound is theirs to hear in the app, not part of the
   * file), and those they answered as a teacher, with the answer (F7, T3, ADR-0012).
   */
  recordings: Record<string, unknown>[];
  /** The review deck and the best times of the timed games (ADR-0021, ADR-0022). */
  progress: Progress;
  /** Rounds finished and rule cards read, from which XP and the streak come (ADR-0023). */
  activity: StoredEvent[];
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
    const [
      profile,
      totp,
      sessions,
      passkeys,
      translations,
      halaqat,
      assignments,
      recordings,
      progress,
      activity,
      audit,
    ] = await Promise.all([
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
        `select a.id, a.halaqa_id, a.kind, a.sura, a.aya_from, a.aya_to, a.word_from,
                a.word_to, a.focus_rule,
                a.repetitions, a.note, to_char(a.due_on, 'YYYY-MM-DD') as due_on,
                a.created_at, a.created_by = $1 as given_by_you, a.student_id, c.done_at
           from assignments a
           left join assignment_completions c
             on c.assignment_id = a.id and c.student_id = $1
          where a.created_by = $1 or a.student_id = $1 or c.student_id is not null
             or (a.student_id is null and exists (
                   select 1 from halaqa_members m
                    where m.halaqa_id = a.halaqa_id and m.user_id = $1
                      and m.halaqa_role = 'student' and m.status = 'active'))
          order by a.created_at, a.id`,
        [userId]
      ),
      this.pool.query(
        `select id, halaqa_id, assignment_id, sura, aya_from, aya_to, mime, bytes,
                duration_ms, created_at, student_id = $1 as sent_by_you, verdict, remark, note,
                reviewed_by = $1 as answered_by_you, reviewed_at
           from recordings
          where student_id = $1 or reviewed_by = $1
          order by created_at, id`,
        [userId]
      ),
      readProgress(this.pool, userId),
      readActivity(this.pool, userId),
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
      assignments: assignments.rows,
      recordings: recordings.rows,
      progress,
      activity,
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
