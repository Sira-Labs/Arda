/**
 * The ʿarḍ log (spec T4, S4.3; ADR-0025), mounted at /api/v1:
 *
 *   GET    /halaqat/:id/arda-log/summary     per student and sūra         halaqa:review
 *   GET    /halaqat/:id/arda-log?student=    the entries, newest first    halaqa:review
 *   POST   /halaqat/:id/arda-log             write a recitation by hand   halaqa:review
 *   DELETE /halaqat/:id/arda-log/:eid        remove an entry              halaqa:review
 *   GET    /arda-log/summary                 my own, per ḥalaqa and sūra  recitation:own
 *
 * Answers to recordings enter the log with the answer (recordings/repository.ts); these routes
 * read it and take what the sheikh heard face to face. Nothing here is cached.
 */
import type { Context, MiddlewareHandler } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';
import { isAyaRange } from '@arda/quran';
import type { AuthResolver } from '../auth/resolver.js';
import { authorize, type ActorEnv, type AuthorizeLog } from '../authz/middleware.js';
import type { Actor, HalaqaScope } from '../authz/policies.js';
import type { HalaqaRepository } from '../halaqat/repository.js';
import { REMARK_IDS, VERDICTS } from '../recordings/repository.js';
import type { ArdaLogRepository } from './repository.js';

export interface ArdaLogRouteDeps {
  repo: ArdaLogRepository;
  /** How the caller relates to the ḥalaqa in the path. */
  halaqat: Pick<HalaqaRepository, 'membership'>;
  auth: AuthResolver;
  log: AuthorizeLog & { info(obj: object, msg: string): void };
  /** Injected in tests. */
  now?: () => Date;
}

/** Hand entries per student and ḥalaqa: years of weekly ʿarḍ; stops a runaway script. */
export const MAX_HAND_ENTRIES_PER_STUDENT = 2000;
/** One page of entries. */
export const PAGE_SIZE = 50;
/** The earliest day an entry may name: older notebooks are not typed in by the day. */
export const EARLIEST_DAY = '2000-01-01';

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

const NewEntryBody = z
  .object({
    studentId: Id,
    range: z
      .object({ sura: z.number().int(), from: z.number().int(), to: z.number().int() })
      .strict()
      .refine(isAyaRange, { message: 'range' }),
    recitedOn: Day.refine(isCalendarDay, { message: 'recitedOn' }),
    verdict: z.enum(VERDICTS),
    remark: z.enum(REMARK_IDS).nullable().default(null),
    note: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .default(null)
      .transform((note) => (note ? note : null)),
  })
  .strict();

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

export function createArdaLogRoutes(deps: ArdaLogRouteDeps): Hono<ActorEnv> {
  const app = new Hono<ActorEnv>();
  const now = deps.now ?? (() => new Date());

  const scopeOf = async (c: Context, actor: Actor): Promise<HalaqaScope> => {
    const id = Id.safeParse(c.req.param('id'));
    if (!id.success) return { halaqaRole: null };
    const membership = await deps.halaqat.membership(id.data, actor.id);
    return { halaqaRole: membership?.status === 'active' ? membership.role : null };
  };
  const own = authorize(deps.auth, 'recitation:own', deps.log);
  const review = authorize(deps.auth, 'halaqa:review', deps.log, scopeOf);

  const noStore: MiddlewareHandler = async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  };
  app.use('/arda-log/*', noStore);
  app.use('/halaqat/:id/arda-log', noStore);
  app.use('/halaqat/:id/arda-log/*', noStore);

  app.get('/halaqat/:id/arda-log/summary', review, async (c) => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    if (!halaqaId.success) return notFound(c);
    return c.json({ summary: await deps.repo.summary(halaqaId.data) });
  });

  app.get('/halaqat/:id/arda-log', review, async (c) => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    if (!halaqaId.success) return notFound(c);
    const query = z
      .object({ student: Id.optional(), before: Id.optional() })
      .strict()
      .safeParse(c.req.query());
    if (!query.success)
      return invalid(
        c,
        query.error.issues.map((i) => String(i.path[0] ?? 'query'))
      );
    return c.json(
      await deps.repo.entries(halaqaId.data, {
        studentId: query.data.student,
        before: query.data.before,
        limit: PAGE_SIZE,
      })
    );
  });

  app.post('/halaqat/:id/arda-log', review, async (c) => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    if (!halaqaId.success) return notFound(c);
    const body = NewEntryBody.safeParse(await readJson(c));
    if (!body.success)
      return invalid(
        c,
        body.error.issues.map((i) => String(i.path[0] ?? 'body'))
      );
    // Not in the future: a day ahead allows for the teacher's time zone.
    const latest = dayOf(new Date(now().getTime() + DAY_MS));
    if (body.data.recitedOn > latest || body.data.recitedOn < EARLIEST_DAY) {
      return invalid(c, ['recitedOn']);
    }
    const actor = c.get('actor');
    const outcome = await deps.repo.add(
      { ...body.data, halaqaId: halaqaId.data, writtenBy: actor.id },
      MAX_HAND_ENTRIES_PER_STUDENT
    );
    if (outcome.status !== 'added') {
      return outcome.status === 'limit'
        ? c.json({ error: 'too_many_entries' }, 409)
        : invalid(c, ['studentId']);
    }
    deps.log.info(
      { userId: actor.id, halaqaId: halaqaId.data, entryId: outcome.id },
      'arda_log.written'
    );
    return c.json({ id: outcome.id }, 201);
  });

  app.delete('/halaqat/:id/arda-log/:eid', review, async (c) => {
    const halaqaId = Id.safeParse(c.req.param('id'));
    const entryId = Id.safeParse(c.req.param('eid'));
    if (!halaqaId.success || !entryId.success) return notFound(c);
    if (!(await deps.repo.remove(halaqaId.data, entryId.data))) return notFound(c);
    deps.log.info(
      { userId: c.get('actor').id, halaqaId: halaqaId.data, entryId: entryId.data },
      'arda_log.removed'
    );
    return c.body(null, 204);
  });

  app.get('/arda-log/summary', own, async (c) =>
    c.json({ summary: await deps.repo.ownSummary(c.get('actor').id) })
  );

  return app;
}
