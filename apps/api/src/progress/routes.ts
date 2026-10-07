/**
 * Progress on the account (ADR-0022, S5.2), mounted at /api/v1:
 *
 *   POST /progress/sync  { cards, bestTimes } → { cards, bestTimes }   progress:own
 *
 * The device sends its whole deck; the answer is the merged deck, which the device merges into
 * its own. 413 `too_many` when the deck would pass the limits; nothing is stored then.
 */
import type { Context } from 'hono';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AuthResolver } from '../auth/resolver.js';
import { authorize, type ActorEnv, type AuthorizeLog } from '../authz/middleware.js';
import { MAX_CARDS, MAX_GAMES, type ProgressRepository } from './repository.js';

export interface ProgressRouteDeps {
  repo: ProgressRepository;
  auth: AuthResolver;
  log: AuthorizeLog & { info(obj: object, msg: string): void };
}

/** A full deck of 5,000 cards with long Arabic prompts stays below this. */
export const MAX_BODY_BYTES = 2_000_000;

const Name = /^[a-z][a-z-]{0,39}$/;
const Millis = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

const Card = z
  .object({
    id: z.string().min(1).max(300),
    kind: z.string().regex(Name),
    prompt: z.string().min(1).max(200),
    answer: z.string().regex(Name),
    box: z.number().int().min(1).max(5),
    due: Millis,
    lapses: z.number().int().min(0).max(1_000_000),
    updatedAt: Millis,
  })
  .strict();

const Body = z
  .object({
    // Counts are checked after parsing: past the limits is 413, not a malformed body.
    cards: z.array(Card),
    bestTimes: z.record(
      z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/),
      // A day: longer is no time, it is a game left open.
      z.number().int().min(1).max(86_400_000)
    ),
  })
  .strict();

/** The JSON body, or `undefined` when it is not JSON. */
async function readJson(c: Context): Promise<unknown | undefined> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

export function createProgressRoutes(deps: ProgressRouteDeps): Hono<ActorEnv> {
  const app = new Hono<ActorEnv>();
  const own = authorize(deps.auth, 'progress:own', deps.log);
  const sizeLimit = bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) => c.json({ error: 'too_large' }, 413),
  });

  app.post('/progress/sync', own, sizeLimit, async (c) => {
    c.header('Cache-Control', 'no-store');
    const parsed = Body.safeParse(await readJson(c));
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => String(i.path[0] ?? 'body'));
      return c.json({ error: 'invalid_body', issues: [...new Set(issues)] }, 400);
    }
    if (
      parsed.data.cards.length > MAX_CARDS ||
      Object.keys(parsed.data.bestTimes).length > MAX_GAMES
    ) {
      return c.json({ error: 'too_many' }, 413);
    }
    const actor = c.get('actor');
    const outcome = await deps.repo.sync(actor.id, parsed.data);
    if (!outcome.ok) return c.json({ error: outcome.error }, 413);
    deps.log.info(
      {
        userId: actor.id,
        sent: parsed.data.cards.length,
        stored: outcome.progress.cards.length,
      },
      'progress.synced'
    );
    return c.json(outcome.progress);
  });

  return app;
}
