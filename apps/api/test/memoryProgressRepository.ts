/**
 * An in-memory ProgressRepository for route tests: the same contract as the Postgres one
 * (checked against it in auth.pg.integration.test.ts), built on the same pure merge.
 */
import {
  clampToNow,
  MAX_CARDS,
  MAX_GAMES,
  mergeProgress,
  type Progress,
  type ProgressRepository,
  type SyncOutcome,
} from '../src/progress/repository.js';

export class MemoryProgressRepository implements ProgressRepository {
  readonly stored = new Map<string, Progress>();

  constructor(private readonly now: () => number = Date.now) {}

  async sync(userId: string, incoming: Progress): Promise<SyncOutcome> {
    const current = this.stored.get(userId) ?? { cards: [], bestTimes: {} };
    const merged = mergeProgress(current, clampToNow(incoming, this.now()));
    if (
      merged.cards.length > MAX_CARDS ||
      Object.keys(merged.bestTimes).length > MAX_GAMES
    ) {
      return { ok: false, error: 'too_many' };
    }
    merged.cards.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    this.stored.set(userId, merged);
    return { ok: true, progress: structuredClone(merged) };
  }
}
