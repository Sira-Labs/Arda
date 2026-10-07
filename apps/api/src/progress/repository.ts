/**
 * Progress on the account (ADR-0022): the review deck and the best times (ADR-0021), merged
 * with what a device sends. Per card the later `updatedAt` wins, per game the better time; both
 * merges are idempotent, so a retried or repeated sync changes nothing.
 */
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

/** The merged deck, or `too_many` when it would pass the limits (nothing is stored then). */
export type SyncOutcome =
  { ok: true; progress: Progress } | { ok: false; error: 'too_many' };

export interface ProgressRepository {
  /** Merges `incoming` into the person's progress and returns all of it. */
  sync(userId: string, incoming: Progress): Promise<SyncOutcome>;
}

/** Cards one person may keep: every unit's questions many times over. */
export const MAX_CARDS = 5_000;
/** Timed games one person may have a best time in. */
export const MAX_GAMES = 100;

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
export function clampToNow(progress: Progress, now: number): Progress {
  return {
    ...progress,
    cards: progress.cards.map((card) =>
      card.updatedAt > now ? { ...card, updatedAt: now } : card
    ),
  };
}

const withinLimits = (progress: Progress): boolean =>
  progress.cards.length <= MAX_CARDS &&
  Object.keys(progress.bestTimes).length <= MAX_GAMES;

export class PgProgressRepository implements ProgressRepository {
  constructor(
    private readonly pool: pg.Pool,
    private readonly now: () => number = Date.now
  ) {}

  async sync(userId: string, incoming: Progress): Promise<SyncOutcome> {
    // One version per card id: a repeated id would make the upsert touch a row twice.
    const once = mergeProgress({ cards: [], bestTimes: {} }, incoming);
    const { cards, bestTimes } = clampToNow(once, this.now());
    const games = Object.entries(bestTimes);
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
      const progress = await readProgress(client, userId);
      if (!withinLimits(progress)) {
        await client.query('rollback');
        return { ok: false, error: 'too_many' };
      }
      await client.query('commit');
      return { ok: true, progress };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
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
