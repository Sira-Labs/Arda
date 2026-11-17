/**
 * Audit log (ADR-0005): every privileged change is recorded with who, what, on whom and from
 * where. Append-only; `details` holds before/after values, never secrets.
 */
import type pg from 'pg';

export interface AuditEntry {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

export interface AuditRecord extends Required<Omit<AuditEntry, 'details' | 'ipAddress'>> {
  id: string;
  actorEmail: string | null;
  /**
   * The address of the person the entry is about: the target when it is a user, the member
   * when a teacher approved or removed someone in a ḥalaqa. `null` when the entry is about
   * nobody else or the account is gone.
   */
  subjectEmail: string | null;
  /** The ḥalaqa's name when the entry is about one that still exists. */
  halaqaName: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

const UUID = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

export type Queryable = Pick<pg.PoolClient, 'query'>;

/** Writes one entry; pass the transaction's client so the change and its record commit together. */
export async function writeAudit(db: Queryable, entry: AuditEntry): Promise<void> {
  await db.query(
    `insert into audit_log (actor_id, action, target_type, target_id, details, ip_address)
     values ($1, $2, $3, $4, $5::jsonb, $6)`,
    [
      entry.actorId,
      entry.action,
      entry.targetType,
      entry.targetId,
      JSON.stringify(entry.details ?? {}),
      entry.ipAddress ?? null,
    ]
  );
}

/** Newest first, keyset-paginated by id (monotonic with insertion). */
export async function listAudit(
  db: Queryable,
  { beforeId, limit }: { beforeId: string | null; limit: number }
): Promise<{ entries: AuditRecord[]; next: string | null }> {
  const { rows } = await db.query<{
    id: string;
    actor_id: string | null;
    actor_email: string | null;
    subject_email: string | null;
    halaqa_name: string | null;
    action: string;
    target_type: string;
    target_id: string;
    details: Record<string, unknown>;
    ip_address: string | null;
    created_at: Date;
  }>(
    // The page is cut first; the ids in text columns become uuids only when they look like
    // one, so both joins go through the primary keys.
    `with page as (
       select a.*,
              case when a.target_type = 'user' then a.target_id
                   else a.details->>'userId' end as subject_ref
         from audit_log a
        where ($1::bigint is null or a.id < $1::bigint)
        order by a.id desc
        limit $2
     )
     select p.id, p.actor_id, u.email as actor_email, s.email as subject_email,
            h.name as halaqa_name, p.action, p.target_type, p.target_id, p.details,
            p.ip_address, p.created_at
       from page p
       left join users u on u.id = p.actor_id
       left join users s
         on s.id = case when p.subject_ref ~ '${UUID}' then p.subject_ref::uuid end
       left join halaqat h
         on p.target_type = 'halaqa'
        and h.id = case when p.target_id ~ '${UUID}' then p.target_id::uuid end
      order by p.id desc`,
    [beforeId, limit + 1]
  );
  const page = rows.slice(0, limit);
  return {
    entries: page.map((r) => ({
      id: String(r.id),
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      subjectEmail: r.subject_email,
      halaqaName: r.halaqa_name,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      details: r.details,
      ipAddress: r.ip_address,
      createdAt: r.created_at.toISOString(),
    })),
    next: rows.length > limit ? String(page.at(-1)!.id) : null,
  };
}
