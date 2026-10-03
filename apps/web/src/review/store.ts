import { logger } from '@/services/logger';
import { BOXES, type ReviewCard } from './leitner';

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
  /** Saves the deck and returns what is stored now: it may hold changes made elsewhere. */
  save(state: ReviewState): ReviewState;
  /** Calls `listener` when the deck changes elsewhere (another tab); returns the unsubscribe. */
  subscribe?(listener: (state: ReviewState) => void): () => void;
}

const empty = (): ReviewState => ({ cards: {}, bestTimes: {} });

/**
 * Two decks as one (ADR-0021: last write wins per card): for each card the more recently
 * updated one, for each game the better time. Used when another tab has saved meanwhile.
 */
export function mergeStates(a: ReviewState, b: ReviewState): ReviewState {
  const cards = { ...a.cards };
  for (const [id, card] of Object.entries(b.cards)) {
    const other = cards[id];
    if (!other || card.updatedAt >= other.updatedAt) cards[id] = card;
  }
  const bestTimes = { ...a.bestTimes };
  for (const [game, ms] of Object.entries(b.bestTimes)) {
    const other = bestTimes[game];
    if (other === undefined || ms < other) bestTimes[game] = ms;
  }
  return { cards, bestTimes };
}

/** In memory: for tests, and the fallback when the browser blocks storage. */
export class MemoryReviewStore implements ReviewStore {
  private state: ReviewState;
  constructor(initial: ReviewState = empty()) {
    this.state = structuredClone(initial);
  }
  load(): ReviewState {
    return structuredClone(this.state);
  }
  save(state: ReviewState): ReviewState {
    this.state = structuredClone(state);
    return this.load();
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
    Number.isInteger(value.box) &&
    (value.box as number) >= 1 &&
    (value.box as number) <= BOXES &&
    Number.isFinite(value.due) &&
    Number.isInteger(value.lapses) &&
    (value.lapses as number) >= 0 &&
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
    Object.entries(value.bestTimes).filter(
      ([, ms]) => typeof ms === 'number' && Number.isFinite(ms) && ms > 0
    )
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
    return this.readStored() ?? this.memory.load();
  }

  /** The stored deck; empty for a missing or foreign document, `undefined` if unreadable. */
  private readStored(): ReviewState | undefined {
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
      return undefined;
    }
  }

  save(state: ReviewState): ReviewState {
    // Another tab may have saved since this one loaded: merge instead of overwriting it.
    const stored = this.memoryIsNewer ? undefined : this.readStored();
    const merged = mergeStates(stored ?? this.memory.load(), state);
    this.memory.save(merged);
    try {
      this.backend().setItem(STORAGE_KEY, JSON.stringify(merged));
      this.memoryIsNewer = false;
    } catch (error) {
      // Quota or blocked storage: keep practising, the deck lives for this session.
      log.debug('review storage unavailable', { name: (error as Error).name });
      this.memoryIsNewer = true;
    }
    return merged;
  }

  subscribe(listener: (state: ReviewState) => void): () => void {
    // `storage` events fire in the other tabs of this origin, never in the writing one.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) listener(this.load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }
}
