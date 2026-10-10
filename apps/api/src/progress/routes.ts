/**
 * Progress on the account (ADR-0022, S5.2), mounted at /api/v1:
 *
 *   POST /progress/sync  { userId, cards, bestTimes, places?, notes?, events?, since? }
 *                        → { cards, bestTimes, places, notes, events, more }  progress:own
 *
 * The device sends its whole deck; the answer is the merged deck, which the device merges into
 * its own. With it go the activity events the server has not confirmed (ADR-0023) and the last
 * sequence number the device has seen; the answer carries the events after it, a page at a
 * time (`more`). Reading places (one muṣḥaf page per script) and study notes ("Mein Lernplan",
 * private to the person) merge by time like the cards. 413 `too_many` when the deck, the notes
 * or the log would pass the limits; nothing is stored then.
 * `userId` names the account the deck belongs to: when the session cookie has meanwhile been
 * replaced by another account's (a sign-in in another tab), 409 `other_account` keeps one
 * person's deck out of another's account.
 */
import type { Context } from 'hono';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AuthResolver } from '../auth/resolver.js';
import { authorize, type ActorEnv, type AuthorizeLog } from '../authz/middleware.js';
import { ACTIVITY_KINDS, MAX_ROUND_TOTAL } from '@arda/engagement';
import { PAGE_LAYOUTS, isAyaRange, isPageRun } from '@arda/quran';
import {
  MAX_CARDS,
  MAX_EVENTS_PER_REQUEST,
  MAX_GAMES,
  MAX_NOTES,
  NOTE_KINDS,
  READING_SCRIPTS,
  type ProgressRepository,
} from './repository.js';

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

const Event = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(ACTIVITY_KINDS),
    ref: z.string().regex(/^[a-z0-9-]{0,40}$/),
    at: Millis,
    right: z.number().int().min(0),
    total: z.number().int().min(0).max(MAX_ROUND_TOTAL),
  })
  .strict()
  .refine((event) => event.right <= event.total, { message: 'right' });

const Place = z
  .object({
    script: z.enum(READING_SCRIPTS),
    page: z.number().int().min(1).max(1000),
    at: Millis,
  })
  .strict();

const Note = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(NOTE_KINDS),
    text: z.string().trim().max(500),
    range: z
      .object({ sura: z.number().int(), from: z.number().int(), to: z.number().int() })
      .strict()
      .refine(isAyaRange, { message: 'range' })
      .nullable(),
    pages: z
      .object({
        layout: z.enum(PAGE_LAYOUTS),
        from: z.number().int(),
        to: z.number().int(),
      })
      .strict()
      .refine(isPageRun, { message: 'pages' })
      .nullable(),
    done: z.boolean(),
    deleted: z.boolean(),
    createdAt: Millis,
    updatedAt: Millis,
  })
  .strict()
  .refine((note) => !(note.range && note.pages), { message: 'pages' })
  .refine((note) => note.deleted || note.text.length > 0, { message: 'text' })
  // A deleted note keeps nothing of what it said.
  .transform((note) =>
    note.deleted ? { ...note, text: '', range: null, pages: null } : note
  );

const Body = z
  .object({
    userId: z.string().min(1).max(200),
    // Counts are checked after parsing: past the limits is 413, not a malformed body.
    cards: z.array(Card),
    bestTimes: z.record(
      z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/),
      // A day: longer is no time, it is a game left open.
      z.number().int().min(1).max(86_400_000)
    ),
    // One per script; a repeated script is merged by time like a repeated card.
    places: z.array(Place).max(READING_SCRIPTS.length).default([]),
    notes: z.array(Note).default([]),
    events: z.array(Event).default([]),
    /** The last sequence number the device has seen. */
    since: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
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
      Object.keys(parsed.data.bestTimes).length > MAX_GAMES ||
      parsed.data.notes.length > MAX_NOTES ||
      parsed.data.events.length > MAX_EVENTS_PER_REQUEST
    ) {
      return c.json({ error: 'too_many' }, 413);
    }
    const actor = c.get('actor');
    const { userId, ...deck } = parsed.data;
    if (userId !== actor.id) return c.json({ error: 'other_account' }, 409);
    const outcome = await deps.repo.sync(actor.id, deck);
    if (!outcome.ok) return c.json({ error: outcome.error }, 413);
    deps.log.info(
      {
        userId: actor.id,
        sent: parsed.data.cards.length,
        stored: outcome.progress.cards.length,
        events: parsed.data.events.length,
      },
      'progress.synced'
    );
    return c.json(outcome.progress);
  });

  return app;
}
