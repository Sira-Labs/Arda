/**
 * Progress on the account (ADR-0022): the review deck and the best times (ADR-0021), merged
 * with what a device sends. Per card the later `updatedAt` wins, per game the better time; both
 * merges are idempotent, so a retried or repeated sync changes nothing.
 *
 * The activity log (ADR-0023) is added to, never merged: the device sends the events the server
 * has not confirmed and the last sequence number it has seen, and gets back what came after it.
 */
import type { ActivityEvent } from '@arda/engagement';
import type pg from 'pg';

/** One review card as the client schedules it (apps/web/src/review/leitner.ts). */
export interface ProgressCard {
  id: string;
  kind: string;
  prompt: string;
  answer: string;
  box: number;
  /** Epoch milliseconds. */
  due: number;
  lapses: number;
  /** Epoch milliseconds; the later one wins. */
  updatedAt: number;
}

export interface Progress {
  cards: ProgressCard[];
  /** Best time per game in milliseconds. */
  bestTimes: Record<string, number>;
}

/** An event as the server keeps it: with its place in the person's log. */
export interface StoredEvent extends ActivityEvent {
  seq: number;
}

/** What a device sends: its deck, its unconfirmed events and the last sequence number seen. */
export interface SyncInput extends Progress {
  events?: ActivityEvent[];
  since?: number;
}

/**
 * The merged deck, and the events after `since` (and those just sent), oldest first; `more`
 * when another page follows.
 */
export interface SyncResult extends Progress {
  events: StoredEvent[];
  more: boolean;
}

/** The merged deck, or `too_many` when it would pass the limits (nothing is stored then). */
export type SyncOutcome =
  { ok: true; progress: SyncResult } | { ok: false; error: 'too_many' };

export interface ProgressRepository {
  /** Merges `incoming` into the person's progress and returns all of it. */
  sync(userId: string, incoming: SyncInput): Promise<SyncOutcome>;
}

/** Cards one person may keep: every unit's questions many times over. */
export const MAX_CARDS = 5_000;
/** Timed games one person may have a best time in. */
export const MAX_GAMES = 100;
/** Events one request may bring; a device with more sends them in turns. */
export const MAX_EVENTS_PER_REQUEST = 500;
/** Events one person may keep: decades of daily practice. */
export const MAX_EVENTS = 100_000;
/** Events one answer carries; `more` asks for the next page. */
export const EVENT_PAGE = 1_000;

/** Pure: per card the later version, per game the better time (the client's `mergeStates`). */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const cards = new Map(a.cards.map((card) => [card.id, card]));
  for (const card of b.cards) {
    const other = cards.get(card.id);
    if (!other || card.updatedAt >= other.updatedAt) cards.set(card.id, card);
  }
  const bestTimes = { ...a.bestTimes };
  for (const [game, ms] of Object.entries(b.bestTimes)) {
    const other = bestTimes[game];
    if (other === undefined || ms < other) bestTimes[game] = ms;
  }
  return { cards: [...cards.values()], bestTimes };
}

/**
 * A card dated after `now` (a device clock running ahead) is stored as answered now, so it
 * cannot win every later merge against correctly dated answers.
 */
export function clampToNow<P extends Progress>(progress: P, now: number): P {
  return {
    ...progress,
    cards: progress.cards.map((card) =>
      card.updatedAt > now ? { ...card, updatedAt: now } : card
    ),
  };
}

/** Events dated after `now` count as done now: a clock ahead cannot buy tomorrow's streak. */
export function eventsUpToNow(
  events: readonly ActivityEvent[],
  now: number
): ActivityEvent[] {
  // One per id (as Postgres compares uuids), so the insert never meets an id twice.
  const once = new Map(
    events.map((event) => [
      event.id.toLowerCase(),
      { ...event, id: event.id.toLowerCase() },
    ])
  );
  return [...once.values()].map((event) =>
    event.at > now ? { ...event, at: now } : event
  );
}

const withinLimits = (progress: Progress): boolean =>
  progress.cards.length <= MAX_CARDS &&
  Object.keys(progress.bestTimes).length <= MAX_GAMES;

export class PgProgressRepository implements ProgressRepository {
  constructor(
    private readonly pool: pg.Pool,
    private readonly now: () => number = Date.now
  ) {}

  async sync(userId: string, incoming: SyncInput): Promise<SyncOutcome> {
    const now = this.now();
    // One version per card id: a repeated id would make the upsert touch a row twice.
    const once = mergeProgress({ cards: [], bestTimes: {} }, incoming);
    const { cards, bestTimes } = clampToNow(once, now);
    const games = Object.entries(bestTimes);
    const events = eventsUpToNow(incoming.events ?? [], now);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      // Two devices syncing at once take turns, so the limit is counted on settled rows.
      await client.query('select id from users where id = $1 for update', [userId]);
      if (cards.length > 0) {
        await client.query(
          `insert into review_cards
                  (user_id, card_id, kind, prompt, answer, box, due, lapses, updated_at)
           select $1, * from unnest($2::text[], $3::text[], $4::text[], $5::text[],
                                    $6::smallint[], $7::bigint[], $8::integer[], $9::bigint[])
           on conflict (user_id, card_id) do update
              set kind = excluded.kind, prompt = excluded.prompt, answer = excluded.answer,
                  box = excluded.box, due = excluded.due, lapses = excluded.lapses,
                  updated_at = excluded.updated_at
            where excluded.updated_at >= review_cards.updated_at`,
          [
            userId,
            cards.map((c) => c.id),
            cards.map((c) => c.kind),
            cards.map((c) => c.prompt),
            cards.map((c) => c.answer),
            cards.map((c) => c.box),
            cards.map((c) => c.due),
            cards.map((c) => c.lapses),
            cards.map((c) => c.updatedAt),
          ]
        );
      }
      if (games.length > 0) {
        await client.query(
          `insert into best_times (user_id, game, ms)
           select $1, * from unnest($2::text[], $3::integer[])
           on conflict (user_id, game) do update set ms = excluded.ms
            where excluded.ms < best_times.ms`,
          [userId, games.map(([game]) => game), games.map(([, ms]) => ms)]
        );
      }
      if (events.length > 0) {
        await client.query(
          `insert into activity_events (user_id, id, kind, ref, at, right_count, total)
           select $1, * from unnest($2::uuid[], $3::text[], $4::text[], $5::bigint[],
                                    $6::smallint[], $7::smallint[])
           on conflict (user_id, id) do nothing`,
          [
            userId,
            events.map((e) => e.id),
            events.map((e) => e.kind),
            events.map((e) => e.ref),
            events.map((e) => e.at),
            events.map((e) => e.right),
            events.map((e) => e.total),
          ]
        );
      }
      const progress = await readProgress(client, userId);
      const logged = await client.query<{ n: number }>(
        'select count(*)::int as n from activity_events where user_id = $1',
        [userId]
      );
      if (!withinLimits(progress) || (logged.rows[0]?.n ?? 0) > MAX_EVENTS) {
        await client.query('rollback');
        return { ok: false, error: 'too_many' };
      }
      // After `since`, and the ones just sent (a lost answer may have hidden their numbers).
      const page = await client.query<StoredEvent>(
        `select ${EVENT_COLUMNS} from activity_events
          where user_id = $1 and (seq > $2 or id = any($3::uuid[]))
          order by seq limit $4`,
        [userId, incoming.since ?? 0, events.map((e) => e.id), EVENT_PAGE + 1]
      );
      await client.query('commit');
      return {
        ok: true,
        progress: {
          ...progress,
          events: page.rows.slice(0, EVENT_PAGE),
          more: page.rows.length > EVENT_PAGE,
        },
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}

const EVENT_COLUMNS = `id, kind, ref, at::float8 as at, right_count as "right", total,
  seq::float8 as seq`;

/** The person's whole activity log, oldest first (the GDPR export's `activity`). */
export async function readActivity(
  db: Pick<pg.Pool, 'query'>,
  userId: string
): Promise<StoredEvent[]> {
  const rows = await db.query<StoredEvent>(
    `select ${EVENT_COLUMNS} from activity_events where user_id = $1 order by seq`,
    [userId]
  );
  return rows.rows;
}

/** The person's deck and best times, cards in id order; also the GDPR export's `progress`. */
export async function readProgress(
  db: Pick<pg.Pool, 'query'>,
  userId: string
): Promise<Progress> {
  const [cards, times] = await Promise.all([
    db.query<ProgressCard>(
      `select card_id as id, kind, prompt, answer, box, due::float8 as due, lapses,
              updated_at::float8 as "updatedAt"
         from review_cards where user_id = $1 order by card_id`,
      [userId]
    ),
    db.query<{ game: string; ms: number }>(
      'select game, ms from best_times where user_id = $1 order by game',
      [userId]
    ),
  ]);
  return {
    cards: cards.rows,
    bestTimes: Object.fromEntries(times.rows.map((row) => [row.game, row.ms])),
  };
}
