import { afterEach, describe, expect, it, vi } from 'vitest';
import { answer, fromMistake, isDue, type ReviewCard } from '@/review/leitner';
import {
  LocalReviewStore,
  MemoryReviewStore,
  OWNER_KEY,
  STORAGE_KEY,
  mergeStates,
  sameState,
  type ReviewState,
} from '@/review/store';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 3, 12);
const CARD = {
  id: 'sort:ب',
  kind: 'sort-letter' as const,
  prompt: 'ب',
  answer: 'iqlab' as const,
};

describe('Leitner scheduling (ADR-0021)', () => {
  it('puts a mistake in box 1, due at once', () => {
    const card = fromMistake(CARD, NOW);
    expect(card).toMatchObject({ box: 1, due: NOW, lapses: 1 });
    expect(isDue(card, NOW)).toBe(true);
  });

  it('moves a right answer up one box, with growing intervals', () => {
    let card: ReviewCard = fromMistake(CARD, NOW);
    const due: number[] = [];
    for (let i = 0; i < 5; i++) {
      card = answer(card, true, NOW);
      due.push((card.due - NOW) / DAY);
    }
    expect(due).toEqual([1, 3, 7, 16, 30]);
    expect(card.box).toBe(5);
    expect(isDue(card, NOW + 29 * DAY)).toBe(false);
  });

  it('sends a wrong answer back to box 1 and counts the lapse', () => {
    const promoted = answer(answer(fromMistake(CARD, NOW), true, NOW), true, NOW);
    const missed = answer(promoted, false, NOW + DAY);
    expect(missed).toMatchObject({ box: 1, due: NOW + DAY, lapses: 2 });
  });
});

function fakeStorage(throwOn?: 'get' | 'set') {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => {
      if (throwOn === 'get') throw new DOMException('blocked', 'SecurityError');
      return data.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (throwOn === 'set') throw new DOMException('full', 'QuotaExceededError');
      data.set(key, value);
    },
  };
}

describe('review stores', () => {
  const state = {
    cards: { [CARD.id]: fromMistake(CARD, NOW) },
    bestTimes: { 'sort-28': 41_000 },
  };

  it('keep the deck in one versioned document', () => {
    const storage = fakeStorage();
    new LocalReviewStore(storage).save(state);
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!)).toEqual(state);
    expect(new LocalReviewStore(storage).load()).toEqual(state);
  });

  it('start empty from a missing, broken or foreign document', () => {
    const storage = fakeStorage();
    expect(new LocalReviewStore(storage).load()).toEqual({ cards: {}, bestTimes: {} });
    storage.data.set(STORAGE_KEY, '{not json');
    expect(new LocalReviewStore(storage).load()).toEqual({ cards: {}, bestTimes: {} });
    storage.data.set(STORAGE_KEY, '[1,2]');
    expect(new LocalReviewStore(storage).load()).toEqual({ cards: {}, bestTimes: {} });
  });

  it('keep practising in memory when storage is blocked or full', () => {
    const full = new LocalReviewStore(fakeStorage('set'));
    full.save(state);
    const blocked = new LocalReviewStore(fakeStorage('get'));
    expect(blocked.load()).toEqual({ cards: {}, bestTimes: {} });
    expect(() => full.save(state)).not.toThrow();
  });

  it('never hand back an older stored deck after a write failed', () => {
    const storage = fakeStorage();
    const store = new LocalReviewStore(storage);
    store.save({ cards: {}, bestTimes: { 'sort-28': 50_000 } });
    // The quota runs out: the newer deck lives in memory, the old one is still in storage.
    storage.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    store.save(state);
    expect(store.load()).toEqual(state);
  });

  it('keep the memory copy current, so a later outage still has the latest deck', () => {
    const storage = fakeStorage();
    const store = new LocalReviewStore(storage);
    const realSet = storage.setItem;
    storage.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    store.save({ cards: {}, bestTimes: { 'sort-28': 60_000 } });
    storage.setItem = realSet;
    store.save(state);
    // Storage becomes unreadable: the deck comes from memory, and it is the latest one.
    storage.getItem = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    expect(store.load()).toEqual(state);
  });

  it('drop damaged entries one by one instead of breaking the app', () => {
    const storage = fakeStorage();
    const good = state.cards[CARD.id]!;
    storage.data.set(
      STORAGE_KEY,
      JSON.stringify({
        cards: {
          [CARD.id]: good,
          gone: null,
          half: { id: 'half', kind: 'sort-letter', prompt: 'ت' },
          wrongId: { ...good, id: 'other' },
        },
        bestTimes: { 'sort-28': 41_000, broken: 'fast' },
      })
    );
    expect(new LocalReviewStore(storage).load()).toEqual(state);
  });

  it('drop numbers that break the scheduling', () => {
    const storage = fakeStorage();
    const good = state.cards[CARD.id]!;
    storage.data.set(
      STORAGE_KEY,
      JSON.stringify({
        cards: {
          [CARD.id]: good,
          half: { ...good, id: 'half', box: 1.5 },
          six: { ...good, id: 'six', box: 6 },
          minus: { ...good, id: 'minus', lapses: -1 },
        },
        bestTimes: { 'sort-28': 41_000, negative: -5, zero: 0 },
      })
    );
    expect(new LocalReviewStore(storage).load()).toEqual(state);
  });

  it('merge with what another tab saved instead of overwriting it', () => {
    const storage = fakeStorage();
    const first = new LocalReviewStore(storage);
    const second = new LocalReviewStore(storage);
    // Both tabs start from the same, empty deck.
    first.load();
    second.load();
    const other = fromMistake(
      { ...CARD, id: 'sort:ت', prompt: 'ت', answer: 'ikhfa' },
      NOW
    );
    first.save({
      cards: { [CARD.id]: fromMistake(CARD, NOW) },
      bestTimes: { 'sort-28': 40_000 },
    });
    const merged = second.save({
      cards: { [other.id]: other },
      bestTimes: { 'sort-28': 45_000 },
    });
    expect(Object.keys(merged.cards).sort()).toEqual([CARD.id, other.id].sort());
    expect(merged.bestTimes['sort-28']).toBe(40_000);
    expect(new LocalReviewStore(storage).load()).toEqual(merged);
  });

  it('keep the more recently answered version of a card', () => {
    const older = fromMistake(CARD, NOW);
    const newer = answer(older, true, NOW + DAY);
    const a = { cards: { [CARD.id]: newer }, bestTimes: {} };
    const b = { cards: { [CARD.id]: older }, bestTimes: {} };
    expect(mergeStates(a, b).cards[CARD.id]).toEqual(newer);
    expect(mergeStates(b, a).cards[CARD.id]).toEqual(newer);
  });

  it('hand out copies, so a caller cannot change the stored deck', () => {
    const memory = new MemoryReviewStore(state);
    const loaded = memory.load();
    loaded.bestTimes['sort-28'] = 1;
    expect(memory.load().bestTimes['sort-28']).toBe(41_000);
  });
});

describe('the browser default', () => {
  afterEach(() => vi.restoreAllMocks());

  it('survives a browser that blocks storage altogether', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const store = new LocalReviewStore();
    expect(store.load()).toEqual({ cards: {}, bestTimes: {} });
    const state = { cards: {}, bestTimes: { 'sort-28': 30_000 } };
    expect(() => store.save(state)).not.toThrow();
    expect(store.load()).toEqual(state);
  });
});

describe('account sync helpers (ADR-0022)', () => {
  const state = {
    cards: { [CARD.id]: fromMistake(CARD, NOW) },
    bestTimes: { 'sort-28': 41_000 },
  };

  it("replaces the deck instead of merging it (another account's, ADR-0022)", () => {
    const storage = fakeStorage();
    const store = new LocalReviewStore(storage);
    store.save(state);
    const other = { cards: {}, bestTimes: { 'sort-28': 50_000 } };
    expect(store.replace(other)).toEqual(other);
    expect(store.load()).toEqual(other);
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!)).toEqual(other);
    const memory = new MemoryReviewStore(state);
    expect(memory.replace(other)).toEqual(other);
  });

  it('tells equal decks from changed ones', () => {
    const copy = structuredClone(state);
    expect(sameState(state, copy)).toBe(true);
    const answered = answer(state.cards[CARD.id]!, true, NOW + 1);
    expect(sameState(state, { ...copy, cards: { [CARD.id]: answered } })).toBe(false);
    expect(sameState(state, { ...copy, bestTimes: { 'sort-28': 40_000 } })).toBe(false);
    expect(sameState(state, { ...copy, bestTimes: {} })).toBe(false);
    expect(sameState(state, { cards: {}, bestTimes: copy.bestTimes })).toBe(false);
  });

  it('joins a guest deck with the first account and drops another account deck', () => {
    const storage = fakeStorage();
    const store = new LocalReviewStore(storage);
    store.save(state);
    expect(store.claim('u-amina')).toEqual({ state, replaced: false });
    expect(storage.data.get(OWNER_KEY)).toBe('u-amina');
    expect(store.claim('u-amina').replaced).toBe(false);
    expect(store.claim('u-yusuf')).toEqual({
      state: { cards: {}, bestTimes: {} },
      replaced: true,
    });
    const memory = new MemoryReviewStore(state, 'u-amina');
    expect(memory.claim('u-yusuf').replaced).toBe(true);
    expect(memory.load()).toEqual({ cards: {}, bestTimes: {} });
  });

  describe('two tabs, one of them signs another account in', () => {
    function tabs(firstOwner: string | null) {
      const storage = fakeStorage();
      const stale = new LocalReviewStore(storage);
      if (firstOwner) stale.claim(firstOwner);
      stale.save(state);
      stale.load();
      const other = new LocalReviewStore(storage);
      return { storage, stale, other };
    }

    it("never saves the previous account's deck back", () => {
      const { storage, stale, other } = tabs('u-amina');
      other.claim('u-yusuf');
      const answered = answer(state.cards[CARD.id]!, true, NOW + 1);
      const kept = stale.save({ ...state, cards: { [CARD.id]: answered } });
      expect(kept).toEqual({ cards: {}, bestTimes: {} });
      expect(JSON.parse(storage.data.get(STORAGE_KEY)!)).toEqual({
        cards: {},
        bestTimes: {},
      });
      // From then on the tab holds Yusuf's deck and saves normally.
      expect(stale.save(state)).toEqual(state);
    });

    it('tells the stale tab to drop its copy instead of merging it', () => {
      const { stale, other } = tabs('u-amina');
      const heard: [ReviewState, boolean][] = [];
      const stop = stale.subscribe((deck, replaced) => heard.push([deck, replaced]));
      other.claim('u-yusuf');
      window.dispatchEvent(new StorageEvent('storage', { key: OWNER_KEY }));
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
      stop();
      expect(heard).toEqual([
        [{ cards: {}, bestTimes: {} }, true],
        [{ cards: {}, bestTimes: {} }, false],
      ]);
    });

    it("keeps a guest tab's answers when the guest signs in elsewhere", () => {
      const { stale, other } = tabs(null);
      other.claim('u-amina');
      const answered = answer(state.cards[CARD.id]!, true, NOW + 1);
      expect(
        stale.save({ ...state, cards: { [CARD.id]: answered } }).cards[CARD.id]
      ).toEqual(answered);
    });
  });
});
