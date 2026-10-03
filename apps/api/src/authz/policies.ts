/**
 * Authorisation policies (ADR-0005, ported from Suffa). Pure functions, no I/O: routes declare
 * the action they need, the middleware asks `can()`, and a table-driven test runs every action
 * against every role. There are no inline role checks in handlers.
 *
 * Two layers:
 * - Platform role (`users.role`) decides capabilities: who may open a ḥalaqa, who reaches
 *   the admin area. A sheikh is a `teacher`; only an admin grants that role.
 * - Ḥalaqa role (`halaqa_members.halaqa_role`, spec story T1) decides data scope: a teacher
 *   hears recitations only of students in a ḥalaqa they teach. Scoped actions take that
 *   relation as the resource.
 */

export const ROLES = ['student', 'teacher', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/** The signed-in person as the policies see them. */
export interface Actor {
  id: string;
  role: Role;
  /** This session confirmed the second factor recently (see SECOND_FACTOR_TTL_MS). */
  secondFactor?: boolean;
}

/** How the actor relates to a ḥalaqa (loaded by the route, never sent by the client). */
export interface HalaqaScope {
  halaqaRole: 'teacher' | 'student' | null;
}

/**
 * Capability matrix: action → platform roles allowed. The single source of truth; the matrix
 * test and the docs read it from here. Ḥalaqa actions are listed now so the scope rules are
 * fixed (and tested) before their routes exist.
 */
export const RBAC_MATRIX = {
  /** Read one's own account (/me). */
  'profile:read': ['student', 'teacher', 'admin'],
  /** Change one's own settings, devices and passkeys; export or delete one's account. */
  'profile:write': ['student', 'teacher', 'admin'],
  /** Open a ḥalaqa (one-to-one or a circle). */
  'halaqa:create': ['teacher', 'admin'],
  /** Invite, approve and remove members, assign work; scoped: teacher of that ḥalaqa. */
  'halaqa:manage': ['teacher', 'admin'],
  /** See one's ḥalaqāt and join one with an invite. */
  'halaqa:join': ['student', 'teacher', 'admin'],
  /** Read a ḥalaqa's assignments and feed; scoped: active member of it. */
  'halaqa:read': ['student', 'teacher', 'admin'],
  /** Hear students' recitations and mark them; scoped: teacher of that ḥalaqa. */
  'halaqa:review': ['teacher', 'admin'],
  /** Translate a written remark into a student's language (ADR-0020; costs money). */
  'feedback:translate': ['teacher', 'admin'],
  /** List and search users in the admin area. */
  'admin:users:read': ['admin'],
  /** Change a user's role (e.g. make a sheikh a teacher) or disable them (audit-logged). */
  'admin:users:write': ['admin'],
  /** Read the audit log. */
  'admin:audit:read': ['admin'],
} as const satisfies Record<string, readonly Role[]>;

export type Action = keyof typeof RBAC_MATRIX;
export const ACTIONS = Object.keys(RBAC_MATRIX) as Action[];

/**
 * Actions that also need a confirmed second factor in this session (ADR-0005: admin 2FA).
 * A stolen session cookie or mailbox alone cannot reach the admin area.
 */
export const SECOND_FACTOR_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  'admin:users:read',
  'admin:users:write',
  'admin:audit:read',
]);

/** Allowed by role, but the session still has to confirm the second factor. */
export function needsSecondFactor(actor: Actor, action: Action): boolean {
  return SECOND_FACTOR_ACTIONS.has(action) && actor.secondFactor !== true;
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * May `actor` perform `action`? Anonymous actors may do nothing here (public routes carry no
 * action). Scoped actions without their scope are denied: failing closed beats guessing.
 */
export function can(actor: Actor | null, action: Action, scope?: HalaqaScope): boolean {
  if (!actor) return false;
  const allowed: readonly Role[] = RBAC_MATRIX[action];
  if (!allowed.includes(actor.role)) return false;
  switch (action) {
    case 'halaqa:manage':
    case 'halaqa:review':
      // Admins oversee every ḥalaqa; teachers only those they teach.
      return actor.role === 'admin' || scope?.halaqaRole === 'teacher';
    case 'halaqa:read':
      // Any active member (pending students wait for the teacher's approval first).
      return actor.role === 'admin' || (scope?.halaqaRole ?? null) !== null;
    default:
      return true;
  }
}
