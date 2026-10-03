import { logger } from '@/services/logger';
import type { ReviewCard } from './leitner';

const log = logger.child('review');

/** The review deck and the best times of the timed games (ADR-0021). */
export interface ReviewState {
  cards: Record<string, ReviewCard>;
  /** Best time per game in milliseconds. */
  bestTimes: Record<string, number>;
}

/** Where the deck lives: on the device now, synced with the account later (L3). */
export interface ReviewStore {
  load(): ReviewState;
  save(state: ReviewState): void;
}

const empty = (): ReviewState => ({ cards: {}, bestTimes: {} });

/** In memory: for tests, and the fallback when the browser blocks storage. */
export class MemoryReviewStore implements ReviewStore {
  private state: ReviewState;
  constructor(initial: ReviewState = empty()) {
    this.state = structuredClone(initial);
  }
  load(): ReviewState {
    return structuredClone(this.state);
  }
  save(state: ReviewState): void {
    this.state = structuredClone(state);
  }
}

export const STORAGE_KEY = 'arda.review.v1';

function isState(value: unknown): value is ReviewState {
  if (!value || typeof value !== 'object') return false;
  const { cards, bestTimes } = value as Partial<ReviewState>;
  return (
    typeof cards === 'object' &&
    cards !== null &&
    typeof bestTimes === 'object' &&
    bestTimes !== null
  );
}

/**
 * One versioned JSON document in localStorage. A missing, unreadable or foreign document
 * starts an empty deck; blocked storage keeps the deck in memory for the session.
 */
export class LocalReviewStore implements ReviewStore {
  private readonly memory = new MemoryReviewStore();
  constructor(
    private readonly storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage
  ) {}

  load(): ReviewState {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return empty();
      const parsed: unknown = JSON.parse(raw);
      if (isState(parsed)) return parsed;
      log.warn('review deck ignored: unknown shape');
      return empty();
    } catch (error) {
      if (error instanceof SyntaxError) {
        log.warn('review deck ignored: not JSON');
        return empty();
      }
      log.debug('review storage unavailable', { name: (error as Error).name });
      return this.memory.load();
    }
  }

  save(state: ReviewState): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Quota or blocked storage: keep practising, the deck lives for this session.
      log.debug('review storage unavailable', { name: (error as Error).name });
      this.memory.save(state);
    }
  }
}
