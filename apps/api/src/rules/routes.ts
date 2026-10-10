/**
 * Rule by rule (spec T5, ADR-0026), mounted at /api/v1:
 *
 *   GET /halaqat/:id/rules   who still struggles with which rule   halaqa:rules
 *
 * Per active student and topic: open practice mistakes and the teachers' remarks of the last
 * REMARK_WINDOW_DAYS days. Never cached.
 */
import type { Context } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthResolver } from '../auth/resolver.js';
import { authorize, type ActorEnv, type AuthorizeLog } from '../authz/middleware.js';
import type { Actor, HalaqaScope } from '../authz/policies.js';
import type { HalaqaRepository } from '../halaqat/repository.js';
import type { RuleRepository } from './repository.js';

export interface RuleRouteDeps {
  repo: RuleRepository;
  /** How the caller relates to the ḥalaqa in the path. */
  halaqat: Pick<HalaqaRepository, 'membership'>;
  auth: AuthResolver;
  log: AuthorizeLog;
  /** Injected in tests. */
  now?: () => Date;
}

/** Remarks older than this say how a student was, not how they are. */
export const REMARK_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const Id = z.string().uuid();

export function createRuleRoutes(deps: RuleRouteDeps): Hono<ActorEnv> {
  const app = new Hono<ActorEnv>();
  const now = deps.now ?? (() => new Date());

  const scopeOf = async (c: Context, actor: Actor): Promise<HalaqaScope> => {
    const id = Id.safeParse(c.req.param('id'));
    if (!id.success) return { halaqaRole: null };
    const membership = await deps.halaqat.membership(id.data, actor.id);
    return { halaqaRole: membership?.status === 'active' ? membership.role : null };
  };
  const rules = authorize(deps.auth, 'halaqa:rules', deps.log, scopeOf);

  app.get('/halaqat/:id/rules', rules, async (c) => {
    c.header('Cache-Control', 'no-store');
    const halaqaId = Id.safeParse(c.req.param('id'));
    if (!halaqaId.success) return c.json({ error: 'not_found' }, 404);
    const since = new Date(now().getTime() - REMARK_WINDOW_DAYS * DAY_MS)
      .toISOString()
      .slice(0, 10);
    return c.json({
      since,
      struggles: await deps.repo.struggles(halaqaId.data, since),
    });
  });

  return app;
}
