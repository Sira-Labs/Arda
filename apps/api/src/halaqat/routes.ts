/**
 * Ḥalaqāt (spec T1, ADR-0005), mounted at /api/v1/halaqat:
 *
 *   GET    /                               my ḥalaqāt           halaqa:join
 *   POST   /            { name, oneToOne } open one             halaqa:create
 *   POST   /invites/preview  { token }     where a link leads   halaqa:join
 *   POST   /join             { token }     join (pending)       halaqa:join
 *   GET    /:id                            the ḥalaqa           halaqa:read   (active member)
 *   POST   /:id/invites                    a new link           halaqa:manage (its teacher)
 *   DELETE /:id/invites                    revoke the link      halaqa:manage
 *   POST   /:id/members/:userId/approve    approve a student    halaqa:manage
 *   DELETE /:id/members/:userId            remove a student     halaqa:manage
 *   DELETE /:id/membership                 leave it             halaqa:join   (own row)
 *
 * The scope (how the actor relates to the ḥalaqa in the path) is loaded from the database by
 * `authorize()`, never taken from the request. Invite tokens travel in request bodies only.
 */
import type { Context } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthResolver } from '../auth/resolver.js';
import { authorize, type ActorEnv, type AuthorizeLog } from '../authz/middleware.js';
import type { Actor, HalaqaScope } from '../authz/policies.js';
import {
  INVITE_TTL_MS,
  hashInviteToken,
  isInviteToken,
  newInviteToken,
} from './invites.js';
import type { HalaqaRepository } from './repository.js';

export interface HalaqaRouteDeps {
  repo: HalaqaRepository;
  auth: AuthResolver;
  log: AuthorizeLog & { info(obj: object, msg: string): void };
  /** Injected in tests. */
  now?: () => Date;
}

/** Enough for every class a sheikh teaches; stops a runaway script, not a person. */
export const MAX_HALAQAT_PER_TEACHER = 50;

const Id = z.string().uuid();
const NewHalaqa = z
  .object({
    name: z.string().trim().min(1).max(80),
    oneToOne: z.boolean().default(false),
  })
  .strict();
const TokenBody = z.object({ token: z.string().refine(isInviteToken) }).strict();

async function readJson(c: Context): Promise<unknown | undefined> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

const invalid = (c: Context, issues?: string[]) =>
  c.json({ error: 'invalid_body', ...(issues ? { issues } : {}) }, 400);

export function createHalaqaRoutes(deps: HalaqaRouteDeps): Hono<ActorEnv> {
  const app = new Hono<ActorEnv>();
  const now = deps.now ?? (() => new Date());

  /** The actor's relation to the ḥalaqa in the path; pending members have none yet. */
  const scopeOf = async (c: Context, actor: Actor): Promise<HalaqaScope> => {
    const id = Id.safeParse(c.req.param('id'));
    if (!id.success) return { halaqaRole: null };
    const membership = await deps.repo.membership(id.data, actor.id);
    return { halaqaRole: membership?.status === 'active' ? membership.role : null };
  };
  const join = authorize(deps.auth, 'halaqa:join', deps.log);
  const create = authorize(deps.auth, 'halaqa:create', deps.log);
  const read = authorize(deps.auth, 'halaqa:read', deps.log, scopeOf);
  const manage = authorize(deps.auth, 'halaqa:manage', deps.log, scopeOf);

  app.use('*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  });

  app.get('/', join, async (c) =>
    c.json({ halaqat: await deps.repo.listFor(c.get('actor').id) })
  );

  app.post('/', create, async (c) => {
    const body = NewHalaqa.safeParse(await readJson(c));
    if (!body.success)
      return invalid(
        c,
        body.error.issues.map((i) => i.message)
      );
    const actor = c.get('actor');
    if ((await deps.repo.countCreatedBy(actor.id)) >= MAX_HALAQAT_PER_TEACHER) {
      return c.json({ error: 'too_many_halaqat' }, 409);
    }
    const id = await deps.repo.create({ ...body.data, teacherId: actor.id });
    deps.log.info({ userId: actor.id, halaqaId: id }, 'halaqa.created');
    return c.json({ id }, 201);
  });

  app.post('/invites/preview', join, async (c) => {
    const body = TokenBody.safeParse(await readJson(c));
    if (!body.success) return c.json({ error: 'invite_invalid' }, 404);
    const invite = await deps.repo.findInvite(hashInviteToken(body.data.token), now());
    if (!invite) return c.json({ error: 'invite_invalid' }, 404);
    return c.json({ halaqa: invite });
  });

  app.post('/join', join, async (c) => {
    const body = TokenBody.safeParse(await readJson(c));
    if (!body.success) return c.json({ error: 'invite_invalid' }, 404);
    const actor = c.get('actor');
    // The invite is checked inside the join's transaction, not before it.
    const outcome = await deps.repo.join(
      hashInviteToken(body.data.token),
      actor.id,
      now()
    );
    if (outcome.kind === 'invalid') return c.json({ error: 'invite_invalid' }, 404);
    if (outcome.kind === 'full') return c.json({ error: 'halaqa_full' }, 409);
    if (outcome.kind === 'joined') {
      deps.log.info({ userId: actor.id, halaqaId: outcome.halaqa.id }, 'halaqa.joined');
    }
    return c.json({ halaqa: outcome.halaqa, status: outcome.status });
  });

  app.get('/:id', read, async (c) => {
    const id = Id.safeParse(c.req.param('id'));
    const halaqa = id.success ? await deps.repo.find(id.data) : null;
    if (!halaqa) return c.json({ error: 'not_found' }, 404);
    const actor = c.get('actor');
    const membership = await deps.repo.membership(halaqa.id, actor.id);
    const teaches = actor.role === 'admin' || membership?.role === 'teacher';
    if (!teaches) return c.json({ halaqa, role: 'student' });
    // Only the teacher (and admins) see who belongs, who waits and whether a link is out.
    const [members, invite] = await Promise.all([
      deps.repo.members(halaqa.id),
      deps.repo.activeInvite(halaqa.id, now()),
    ]);
    return c.json({ halaqa, role: 'teacher', members, invite });
  });

  app.post('/:id/invites', manage, async (c) => {
    const id = Id.safeParse(c.req.param('id'));
    if (!id.success || !(await deps.repo.find(id.data))) {
      return c.json({ error: 'not_found' }, 404);
    }
    const token = newInviteToken();
    const expiresAt = new Date(now().getTime() + INVITE_TTL_MS);
    await deps.repo.createInvite({
      halaqaId: id.data,
      tokenHash: hashInviteToken(token),
      actorId: c.get('actor').id,
      expiresAt,
    });
    // The token is shown once; only its hash is stored.
    return c.json({ token, expiresAt: expiresAt.toISOString() }, 201);
  });

  app.delete('/:id/invites', manage, async (c) => {
    const id = Id.safeParse(c.req.param('id'));
    if (!id.success) return c.json({ error: 'not_found' }, 404);
    await deps.repo.revokeInvites(id.data, c.get('actor').id);
    return c.body(null, 204);
  });

  app.post('/:id/members/:userId/approve', manage, async (c) => {
    const id = Id.safeParse(c.req.param('id'));
    const userId = Id.safeParse(c.req.param('userId'));
    if (!id.success || !userId.success) return c.json({ error: 'not_found' }, 404);
    const approved = await deps.repo.approve(id.data, userId.data, c.get('actor').id);
    return approved ? c.body(null, 204) : c.json({ error: 'not_found' }, 404);
  });

  app.delete('/:id/members/:userId', manage, async (c) => {
    const id = Id.safeParse(c.req.param('id'));
    const userId = Id.safeParse(c.req.param('userId'));
    if (!id.success || !userId.success) return c.json({ error: 'not_found' }, 404);
    const removed = await deps.repo.remove(id.data, userId.data, c.get('actor').id);
    return removed ? c.body(null, 204) : c.json({ error: 'not_found' }, 404);
  });

  app.delete('/:id/membership', join, async (c) => {
    const id = Id.safeParse(c.req.param('id'));
    if (!id.success) return c.json({ error: 'not_found' }, 404);
    const left = await deps.repo.leave(id.data, c.get('actor').id);
    return left ? c.body(null, 204) : c.json({ error: 'not_found' }, 404);
  });

  return app;
}
