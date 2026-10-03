/**
 * Assignments (spec T2, ADR-0014), mounted at /api/v1:
 *
 *   GET    /assignments                          what I still have to do   halaqa:join
 *   GET    /halaqat/:id/assignments              the ḥalaqa's assignments  halaqa:read
 *   POST   /halaqat/:id/assignments              give one                  halaqa:manage
 *   DELETE /halaqat/:id/assignments/:aid         take it back              halaqa:manage
 *   PUT    /halaqat/:id/assignments/:aid/done    mark it done              halaqa:study
 *   DELETE /halaqat/:id/assignments/:aid/done    take the mark back        halaqa:study
 *
 * A teacher (or admin) sees every assignment of the ḥalaqa and who is done; a student sees
 * only those for them or for the whole ḥalaqa. The list across ḥalaqāt keeps to the caller's
 * active memberships in its query, like the list of ḥalaqāt itself.
 */
import type { Context } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';
import { isAyaRange } from '@arda/quran';
import { RULE_IDS } from '@arda/tajweed';
import type { AuthResolver } from '../auth/resolver.js';
import { authorize, type ActorEnv, type AuthorizeLog } from '../authz/middleware.js';
import type { Actor, HalaqaScope } from '../authz/policies.js';
import type { HalaqaRepository } from '../halaqat/repository.js';
import { ASSIGNMENT_KINDS, type AssignmentRepository } from './repository.js';

export interface AssignmentRouteDeps {
  repo: AssignmentRepository;
  /** How the caller relates to the ḥalaqa in the path. */
  halaqat: Pick<HalaqaRepository, 'membership'>;
  auth: AuthResolver;
  log: AuthorizeLog & { info(obj: object, msg: string): void };
  /** Injected in tests. */
  now?: () => Date;
}

/** Years of weekly work for a large circle; stops a runaway script, not a sheikh. */
export const MAX_ASSIGNMENTS_PER_HALAQA = 2000;
/** One page of a ḥalaqa's assignments. */
export const PAGE_SIZE = 50;
/** The open assignments shown on Today. */
export const OPEN_LIMIT = 50;
/** How far ahead a due day may lie. */
const MAX_DAYS_AHEAD = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

const Id = z.string().uuid();
const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** `YYYY-MM-DD` of `date` in UTC. */
const dayOf = (date: Date): string => date.toISOString().slice(0, 10);

/** Whether `day` is a real calendar day (not 2026-02-30). */
const isCalendarDay = (day: string): boolean => {
  const parsed = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && dayOf(parsed) === day;
};

const NewAssignmentBody = z
  .object({
    kind: z.enum(ASSIGNMENT_KINDS),
    studentId: Id.nullable().default(null),
    range: z
      .object({ sura: z.number().int(), from: z.number().int(), to: z.number().int() })
      .strict()
      .refine(isAyaRange, { message: 'range' })
      .nullable()
      .default(null),
    focusRule: z.enum(RULE_IDS).nullable().default(null),
    repetitions: z.number().int().min(1).max(20).nullable().default(null),
    note: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .default(null)
      .transform((note) => (note ? note : null)),
    dueOn: Day.refine(isCalendarDay, { message: 'dueOn' }),
  })
  .strict()
  .superRefine((body, ctx) => {
    const needsRange = body.kind === 'read' || body.kind === 'recite';
    if (needsRange && !body.range) ctx.addIssue({ code: 'custom', message: 'range' });
    if (!needsRange && !body.focusRule) {
      ctx.addIssue({ code: 'custom', message: 'focusRule' });
    }
    if (body.repetitions !== null && body.kind !== 'read') {
      ctx.addIssue({ code: 'custom', message: 'repetitions' });
    }
  });

async function readJson(c: Context): Promise<unknown | undefined> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

const invalid = (c: Context, issues: string[]) =>
  c.json({ error: 'invalid_body', issues }, 400);
const notFound = (c: Context) => c.json({ error: 'not_found' }, 404);

export function createAssignmentRoutes(deps: AssignmentRouteDeps): Hono<ActorEnv> {
  const app = new Hono<ActorEnv>();
  const now = deps.now ?? (() => new Date());

  /** The actor's relation to the ḥalaqa in the path; pending members have none yet. */
  const scopeOf = async (c: Context, actor: Actor): Promise<HalaqaScope> => {
    const id = Id.safeParse(c.req.param('id'));
    if (!id.success) return { halaqaRole: null };
    const membership = await deps.halaqat.membership(id.data, actor.id);
    return { halaqaRole: membership?.status === 'active' ? membership.role : null };
  };
  const mine = authorize(deps.auth, 'halaqa:join', deps.log);
  const read = authorize(deps.auth, 'halaqa:read', deps.log, scopeOf);
  const manage = authorize(deps.auth, 'halaqa:manage', deps.log, scopeOf);
  const study = authorize(deps.auth, 'halaqa:study', deps.log, scopeOf);

  /** The ḥalaqa and assignment ids in the path, or `null` when either is malformed. */
  const ids = (c: Context): { halaqaId: string; assignmentId: string } | null => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    const assignmentId = Id.safeParse(c.req.param('aid'));
    return halaqaId.success && assignmentId.success
      ? { halaqaId: halaqaId.data, assignmentId: assignmentId.data }
      : null;
  };

  app.use('*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  });

  app.get('/assignments', mine, async (c) =>
    c.json({ assignments: await deps.repo.open(c.get('actor').id, OPEN_LIMIT) })
  );

  app.get('/halaqat/:id/assignments', read, async (c) => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    const before = c.req.query('before');
    if (!halaqaId.success) return notFound(c);
    if (before !== undefined && !Id.safeParse(before).success) {
      return invalid(c, ['before']);
    }
    const page = { before, limit: PAGE_SIZE };
    const actor = c.get('actor');
    const membership = await deps.halaqat.membership(halaqaId.data, actor.id);
    const teaches = actor.role === 'admin' || membership?.role === 'teacher';
    return c.json(
      teaches
        ? { role: 'teacher', ...(await deps.repo.forTeacher(halaqaId.data, page)) }
        : {
            role: 'student',
            ...(await deps.repo.forStudent(halaqaId.data, actor.id, page)),
          }
    );
  });

  app.post('/halaqat/:id/assignments', manage, async (c) => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    if (!halaqaId.success) return notFound(c);
    const body = NewAssignmentBody.safeParse(await readJson(c));
    if (!body.success)
      return invalid(
        c,
        body.error.issues.map((i) => i.message)
      );
    // A day back allows for the teacher's time zone being behind UTC.
    const today = now().getTime();
    if (
      body.data.dueOn < dayOf(new Date(today - DAY_MS)) ||
      body.data.dueOn > dayOf(new Date(today + MAX_DAYS_AHEAD * DAY_MS))
    ) {
      return invalid(c, ['dueOn']);
    }
    if ((await deps.repo.countIn(halaqaId.data)) >= MAX_ASSIGNMENTS_PER_HALAQA) {
      return c.json({ error: 'too_many_assignments' }, 409);
    }
    const actor = c.get('actor');
    const id = await deps.repo.create({
      ...body.data,
      halaqaId: halaqaId.data,
      createdBy: actor.id,
    });
    if (!id) return invalid(c, ['studentId']);
    deps.log.info(
      {
        userId: actor.id,
        halaqaId: halaqaId.data,
        assignmentId: id,
        kind: body.data.kind,
      },
      'assignment.created'
    );
    return c.json({ id }, 201);
  });

  app.delete('/halaqat/:id/assignments/:aid', manage, async (c) => {
    const path = ids(c);
    if (!path || !(await deps.repo.remove(path.halaqaId, path.assignmentId))) {
      return notFound(c);
    }
    return c.body(null, 204);
  });

  app.put('/halaqat/:id/assignments/:aid/done', study, async (c) => {
    const path = ids(c);
    const actor = c.get('actor');
    if (
      !path ||
      !(await deps.repo.complete(path.halaqaId, path.assignmentId, actor.id))
    ) {
      return notFound(c);
    }
    deps.log.info(
      { userId: actor.id, halaqaId: path.halaqaId, assignmentId: path.assignmentId },
      'assignment.done'
    );
    return c.body(null, 204);
  });

  app.delete('/halaqat/:id/assignments/:aid/done', study, async (c) => {
    const path = ids(c);
    if (
      !path ||
      !(await deps.repo.undo(path.halaqaId, path.assignmentId, c.get('actor').id))
    ) {
      return notFound(c);
    }
    return c.body(null, 204);
  });

  return app;
}
