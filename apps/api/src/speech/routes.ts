/**
 * Measuring the speech check (story S6.2; ADR-0013 update 2026-11-16), mounted at /api/v1:
 *
 *   GET /speech/evaluation                 my opt-in                     profile:read
 *   PUT /speech/evaluation  { optedIn }    give it or take it back       profile:write
 *   GET /halaqat/:id/speech/agreement      the check against the teacher halaqa:review
 *
 * The opt-in is the student's own and separate from the consent to record. The report gives
 * counts per model and rule for the teachers of the ḥalaqa, from students opted in at that
 * moment; no word, no student and no recording is named. Never cached.
 */
import type { Context } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthResolver } from '../auth/resolver.js';
import { authorize, type ActorEnv, type AuthorizeLog } from '../authz/middleware.js';
import type { Actor, HalaqaScope } from '../authz/policies.js';
import type { HalaqaRepository } from '../halaqat/repository.js';
import {
  agreementOf,
  GATE_MIN_AGREEMENT,
  GATE_MIN_OCCURRENCES,
  occurrences,
  reachesGate,
  type EvaluationRepository,
} from './evaluation.js';

export interface SpeechRouteDeps {
  repo: EvaluationRepository;
  /** How the caller relates to the ḥalaqa in the path. */
  halaqat: Pick<HalaqaRepository, 'membership'>;
  auth: AuthResolver;
  log: AuthorizeLog & { info(obj: object, msg: string): void };
  /** Whether the speech check is configured: without it there is nothing to opt in to yet. */
  available: boolean;
}

const Id = z.string().uuid();
const OptInBody = z.object({ optedIn: z.boolean() }).strict();

export function createSpeechRoutes(deps: SpeechRouteDeps): Hono<ActorEnv> {
  const app = new Hono<ActorEnv>();

  const scopeOf = async (c: Context, actor: Actor): Promise<HalaqaScope> => {
    const id = Id.safeParse(c.req.param('id'));
    if (!id.success) return { halaqaRole: null };
    const membership = await deps.halaqat.membership(id.data, actor.id);
    return { halaqaRole: membership?.status === 'active' ? membership.role : null };
  };
  const read = authorize(deps.auth, 'profile:read', deps.log);
  const write = authorize(deps.auth, 'profile:write', deps.log);
  const review = authorize(deps.auth, 'halaqa:review', deps.log, scopeOf);

  app.get('/speech/evaluation', read, async (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json({
      available: deps.available,
      ...(await deps.repo.optIn(c.get('actor').id)),
    });
  });

  app.put('/speech/evaluation', write, async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch (error) {
      if (error instanceof SyntaxError) return c.json({ error: 'invalid_json' }, 400);
      throw error;
    }
    const input = OptInBody.safeParse(body);
    if (!input.success) return c.json({ error: 'invalid_body' }, 400);
    const actor = c.get('actor');
    // Taking it back always works; giving it needs a check to measure.
    if (input.data.optedIn && !deps.available) {
      return c.json({ error: 'speech_unavailable' }, 409);
    }
    await deps.repo.setOptIn(
      actor.id,
      input.data.optedIn,
      c.req.header('x-real-ip') ?? null
    );
    deps.log.info({ userId: actor.id, optedIn: input.data.optedIn }, 'speech.evaluation');
    return c.body(null, 204);
  });

  app.get('/halaqat/:id/speech/agreement', review, async (c) => {
    c.header('Cache-Control', 'no-store');
    const halaqaId = Id.safeParse(c.req.param('id'));
    if (!halaqaId.success) return c.json({ error: 'not_found' }, 404);
    const report = await deps.repo.agreement(halaqaId.data);
    return c.json({
      recordings: report.recordings,
      students: report.students,
      gate: { occurrences: GATE_MIN_OCCURRENCES, agreement: GATE_MIN_AGREEMENT },
      rows: report.rows.map((row) => ({
        ...row,
        occurrences: occurrences(row),
        agreement: agreementOf(row),
        reachesGate: reachesGate(row),
      })),
    });
  });

  return app;
}
