import { logger } from '@/services/logger';
import { BOXES, type ReviewCard } from './leitner';

const log = logger.child('review');

/** The review deck and the best times of the timed games (ADR-0021). */
export interface ReviewState {
  cards: Record<string, ReviewCard>;
  /** Best time per game in milliseconds. */
  bestTimes: Record<string, number>;
}

/** Where the deck lives on the device; `useProgressSync` keeps it in step with the account. */
export interface ReviewStore {
  load(): ReviewState;
  /** Saves the deck and returns what is stored now: it may hold changes made elsewhere. */
  save(state: ReviewState): ReviewState;
  /** Stores exactly `state`, dropping what was there (another account's deck, ADR-0022). */
  replace(state: ReviewState): ReviewState;
  /** Whose deck the device holds now; `null` for a guest's (ADR-0022). */
  owner(): string | null;
  /**
   * Binds the deck to the account signing in. A guest's deck joins it; another account's deck
   * is replaced by an empty one (`replaced`), never merged.
   */
  claim(userId: string): { state: ReviewState; replaced: boolean };
  /**
   * Calls `listener` when the deck changes elsewhere (another tab); `replaced` when it changed
   * hands there, so this tab drops its copy instead of merging it. Returns the unsubscribe.
   */
  subscribe?(listener: (state: ReviewState, replaced: boolean) => void): () => void;
}

export const emptyState = (): ReviewState => ({ cards: {}, bestTimes: {} });

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

/** Do both decks hold the same cards in the same boxes and the same times? */
export function sameState(a: ReviewState, b: ReviewState): boolean {
  const ids = Object.keys(a.cards);
  const games = Object.keys(a.bestTimes);
  if (ids.length !== Object.keys(b.cards).length) return false;
  if (games.length !== Object.keys(b.bestTimes).length) return false;
  return (
    ids.every((id) => {
      const x = a.cards[id]!;
      const y = b.cards[id];
      return (
        y !== undefined &&
        x.updatedAt === y.updatedAt &&
        x.box === y.box &&
        x.due === y.due &&
        x.lapses === y.lapses
      );
    }) && games.every((game) => a.bestTimes[game] === b.bestTimes[game])
  );
}

/** In memory: for tests, and the fallback when the browser blocks storage. */
export class MemoryReviewStore implements ReviewStore {
  private state: ReviewState;
  constructor(
    initial: ReviewState = emptyState(),
    private ownerId: string | null = null
  ) {
    this.state = structuredClone(initial);
  }
  load(): ReviewState {
    return structuredClone(this.state);
  }
  save(state: ReviewState): ReviewState {
    this.state = structuredClone(state);
    return this.load();
  }
  replace(state: ReviewState): ReviewState {
    return this.save(state);
  }
  owner(): string | null {
    return this.ownerId;
  }
  claim(userId: string): { state: ReviewState; replaced: boolean } {
    const replaced = this.ownerId !== null && this.ownerId !== userId;
    this.ownerId = userId;
    return { state: replaced ? this.replace(emptyState()) : this.load(), replaced };
  }
}

export const STORAGE_KEY = 'arda.review.v1';
/** Whose deck `STORAGE_KEY` holds (ADR-0022); missing for a guest's. */
export const OWNER_KEY = 'arda.review.owner';

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

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
export function parseState(value: unknown): ReviewState | undefined {
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
  /** The owner when storage is blocked. */
  private memoryOwner: string | null = null;
  /**
   * The owner of the deck this tab holds. When another tab hands the deck to a different
   * account, this tab's copy is stale and must never be merged back (ADR-0022).
   */
  private known: string | null | undefined;

  /** `storage` is injected in tests; the browser's is looked up on use (see `backend`). */
  constructor(private readonly storage?: KeyValueStorage) {}

  /** Resolved lazily: in a browser that blocks storage, even reading `localStorage` throws. */
  private backend(): KeyValueStorage {
    return this.storage ?? window.localStorage;
  }

  load(): ReviewState {
    this.known = this.owner();
    if (this.memoryIsNewer) return this.memory.load();
    return this.readStored() ?? this.memory.load();
  }

  owner(): string | null {
    try {
      return this.backend().getItem(OWNER_KEY) ?? null;
    } catch (error) {
      log.debug('review storage unavailable', { name: (error as Error).name });
      return this.memoryOwner;
    }
  }

  claim(userId: string): { state: ReviewState; replaced: boolean } {
    const previous = this.owner();
    this.memoryOwner = userId;
    try {
      this.backend().setItem(OWNER_KEY, userId);
    } catch (error) {
      log.debug('review storage unavailable', { name: (error as Error).name });
    }
    this.known = userId;
    const replaced = previous !== null && previous !== userId;
    return { state: replaced ? this.replace(emptyState()) : this.load(), replaced };
  }

  /** Another tab gave the deck to a different account since this tab last read it. */
  private changedHands(): boolean {
    const current = this.owner();
    const changed = this.known != null && current !== this.known;
    this.known = current;
    return changed;
  }

  /** The stored deck; empty for a missing or foreign document, `undefined` if unreadable. */
  private readStored(): ReviewState | undefined {
    try {
      const raw = this.backend().getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = parseState(JSON.parse(raw));
      if (parsed) return parsed;
      log.warn('review deck ignored: unknown shape');
      return emptyState();
    } catch (error) {
      if (error instanceof SyntaxError) {
        log.warn('review deck ignored: not JSON');
        return emptyState();
      }
      log.debug('review storage unavailable', { name: (error as Error).name });
      return undefined;
    }
  }

  save(state: ReviewState): ReviewState {
    if (this.changedHands()) {
      // This tab's deck is the previous account's: keep the stored one, drop this copy.
      log.info('review deck changed hands in another tab; this copy is dropped');
      return this.load();
    }
    // Another tab may have saved since this one loaded: merge instead of overwriting it.
    const stored = this.memoryIsNewer ? undefined : this.readStored();
    return this.write(mergeStates(stored ?? this.memory.load(), state));
  }

  replace(state: ReviewState): ReviewState {
    return this.write(state);
  }

  private write(state: ReviewState): ReviewState {
    this.memory.save(state);
    try {
      this.backend().setItem(STORAGE_KEY, JSON.stringify(state));
      this.memoryIsNewer = false;
    } catch (error) {
      // Quota or blocked storage: keep practising, the deck lives for this session.
      log.debug('review storage unavailable', { name: (error as Error).name });
      this.memoryIsNewer = true;
    }
    return this.memory.load();
  }

  subscribe(listener: (state: ReviewState, replaced: boolean) => void): () => void {
    // `storage` events fire in the other tabs of this origin, never in the writing one.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== OWNER_KEY && event.key !== null)
        return;
      const replaced = this.changedHands();
      listener(this.load(), replaced);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }
}
