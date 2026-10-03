import { describe, expect, it } from 'vitest';
import { answer, fromMistake, isDue, type ReviewCard } from '@/review/leitner';
import { LocalReviewStore, MemoryReviewStore, STORAGE_KEY } from '@/review/store';

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

  it('hand out copies, so a caller cannot change the stored deck', () => {
    const memory = new MemoryReviewStore(state);
    const loaded = memory.load();
    loaded.bestTimes['sort-28'] = 1;
    expect(memory.load().bestTimes['sort-28']).toBe(41_000);
  });
});
