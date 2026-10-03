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

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

const CARD_KINDS: ReadonlySet<unknown> = new Set(['which-rule', 'sort-letter']);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isCard(id: string, value: unknown): value is ReviewCard {
  if (!isRecord(value)) return false;
  return (
    value.id === id &&
    CARD_KINDS.has(value.kind) &&
    typeof value.prompt === 'string' &&
    typeof value.answer === 'string' &&
    Number.isFinite(value.box) &&
    Number.isFinite(value.due) &&
    Number.isFinite(value.lapses) &&
    Number.isFinite(value.updatedAt)
  );
}

/**
 * The deck from a stored document, or `undefined` for a foreign one. Damaged entries (an
 * edited or half-written document) are dropped one by one, so one bad card never costs the
 * whole deck or breaks the app.
 */
function parseState(value: unknown): ReviewState | undefined {
  if (!isRecord(value) || !isRecord(value.cards) || !isRecord(value.bestTimes))
    return undefined;
  const cards = Object.fromEntries(
    Object.entries(value.cards).filter(([id, card]) => isCard(id, card))
  ) as Record<string, ReviewCard>;
  const bestTimes = Object.fromEntries(
    Object.entries(value.bestTimes).filter(([, ms]) => Number.isFinite(ms))
  ) as Record<string, number>;
  const dropped =
    Object.keys(value.cards).length -
    Object.keys(cards).length +
    Object.keys(value.bestTimes).length -
    Object.keys(bestTimes).length;
  if (dropped > 0) log.warn('review deck: damaged entries dropped', { dropped });
  return { cards, bestTimes };
}

/**
 * One versioned JSON document in localStorage. A missing, unreadable or foreign document
 * starts an empty deck; blocked or full storage keeps the deck in memory for the session.
 */
export class LocalReviewStore implements ReviewStore {
  /** Always the latest deck saved through this store, whether storage took it or not. */
  private readonly memory = new MemoryReviewStore();
  /** Set while the last write failed: the memory copy is newer than what storage holds. */
  private memoryIsNewer = false;

  /** `storage` is injected in tests; the browser's is looked up on use (see `backend`). */
  constructor(private readonly storage?: KeyValueStorage) {}

  /** Resolved lazily: in a browser that blocks storage, even reading `localStorage` throws. */
  private backend(): KeyValueStorage {
    return this.storage ?? window.localStorage;
  }

  load(): ReviewState {
    if (this.memoryIsNewer) return this.memory.load();
    try {
      const raw = this.backend().getItem(STORAGE_KEY);
      if (!raw) return empty();
      const parsed = parseState(JSON.parse(raw));
      if (parsed) return parsed;
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
    this.memory.save(state);
    try {
      this.backend().setItem(STORAGE_KEY, JSON.stringify(state));
      this.memoryIsNewer = false;
    } catch (error) {
      // Quota or blocked storage: keep practising, the deck lives for this session.
      log.debug('review storage unavailable', { name: (error as Error).name });
      this.memoryIsNewer = true;
    }
  }
}
