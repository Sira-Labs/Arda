import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Actor } from '../src/authz/policies.js';
import {
  clampToNow,
  MAX_CARDS,
  MAX_GAMES,
  mergeProgress,
  type ProgressCard,
} from '../src/progress/repository.js';
import { MAX_BODY_BYTES } from '../src/progress/routes.js';
import { MemoryProgressRepository } from './memoryProgressRepository.js';

const ACTORS: Record<string, Actor> = {
  student: { id: '20000000-0000-4000-8000-000000000001', role: 'student' },
  other: { id: '20000000-0000-4000-8000-000000000002', role: 'student' },
  teacher: { id: '10000000-0000-4000-8000-000000000001', role: 'teacher' },
  admin: { id: '10000000-0000-4000-8000-000000000003', role: 'admin' },
};
const quiet = { warn: () => {}, info: () => {} };
const NOW = Date.UTC(2026, 9, 7, 12);
// Response bodies are checked field by field below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const card = (id: string, updatedAt: number, box = 1): ProgressCard => ({
  id: `which-rule:${id}`,
  kind: 'which-rule',
  prompt: id,
  answer: 'ikhfa',
  box,
  due: updatedAt,
  lapses: 1,
  updatedAt,
});

function setup() {
  const repo = new MemoryProgressRepository(() => NOW);
  const app = createApp({
    version: 't',
    expectedRevision: null,
    health: { schemaRevision: async () => null },
    progress: {
      repo,
      auth: { actor: async (h) => ACTORS[h.get('x-test-actor') ?? ''] ?? null },
      log: quiet,
    },
  });
  const sync = (actor: string, body: unknown) =>
    app.request('/api/v1/progress/sync', {
      method: 'POST',
      headers: { 'x-test-actor': actor, 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  return { repo, sync };
}

describe('progress sync (ADR-0022)', () => {
  // Route × role: everyone signed in syncs their own deck, nobody else's.
  for (const [who, status] of [
    ['', 401],
    ['student', 200],
    ['teacher', 200],
    ['admin', 200],
  ] as const) {
    it(`${who || 'anonymous'} → ${status}`, async () => {
      const { sync } = setup();
      const response = await sync(who, { cards: [], bestTimes: {} });
      expect(response.status).toBe(status);
      if (status === 200) expect(response.headers.get('cache-control')).toBe('no-store');
    });
  }

  it('merges per card by time and per game by the better time', async () => {
    const { sync } = setup();
    await sync('student', {
      cards: [card('a', NOW - 5000, 3), card('b', NOW - 5000)],
      bestTimes: { 'sort-28': 40_000 },
    });
    const response = await sync('student', {
      cards: [card('a', NOW - 9000, 1), card('b', NOW - 1000, 2), card('c', NOW - 1000)],
      bestTimes: { 'sort-28': 50_000 },
    });
    const body: Json = await response.json();
    expect(body.cards.map((c: ProgressCard) => [c.prompt, c.box])).toEqual([
      ['a', 3], // the stored one is later
      ['b', 2], // the sent one is later
      ['c', 1],
    ]);
    expect(body.bestTimes).toEqual({ 'sort-28': 40_000 });
  });

  it('keeps each person to their own deck', async () => {
    const { sync } = setup();
    await sync('student', { cards: [card('a', NOW)], bestTimes: { 'sort-28': 1 } });
    const body: Json = await (await sync('other', { cards: [], bestTimes: {} })).json();
    expect(body).toEqual({ cards: [], bestTimes: {} });
  });

  it('stores a card dated in the future as answered now', async () => {
    const { sync } = setup();
    const body: Json = await (
      await sync('student', { cards: [card('a', NOW + 86_400_000)], bestTimes: {} })
    ).json();
    expect(body.cards[0].updatedAt).toBe(NOW);
  });

  it.each([
    ['not JSON', '{'],
    ['an unknown field', { cards: [], bestTimes: {}, xp: 5 }],
    ['a box outside 1–5', { cards: [{ ...card('a', NOW), box: 6 }], bestTimes: {} }],
    ['a negative time', { cards: [{ ...card('a', NOW), due: -1 }], bestTimes: {} }],
    [
      'an odd kind',
      { cards: [{ ...card('a', NOW), kind: 'DROP TABLE' }], bestTimes: {} },
    ],
    ['a game time of zero', { cards: [], bestTimes: { 'sort-28': 0 } }],
    ['an odd game name', { cards: [], bestTimes: { 'Sort 28': 5 } }],
  ])('refuses %s (400)', async (_name, body) => {
    const { sync, repo } = setup();
    const response = await sync('student', body);
    expect(response.status).toBe(400);
    expect(((await response.json()) as Json).error).toBe('invalid_body');
    expect(repo.stored.size).toBe(0);
  });

  it('refuses more cards than a person may keep, and stores none of them (413)', async () => {
    const { sync, repo } = setup();
    const many = (from: number, n: number) =>
      Array.from({ length: n }, (_, i) => card(String(from + i), NOW));
    expect(
      (await sync('student', { cards: many(0, MAX_CARDS), bestTimes: {} })).status
    ).toBe(200);
    const response = await sync('student', { cards: many(MAX_CARDS, 1), bestTimes: {} });
    expect(response.status).toBe(413);
    expect(((await response.json()) as Json).error).toBe('too_many');
    expect(repo.stored.get(ACTORS.student!.id)!.cards).toHaveLength(MAX_CARDS);
  });

  it.each([
    [
      'cards',
      {
        cards: Array.from({ length: MAX_CARDS + 1 }, (_, i) => card(String(i), NOW)),
        bestTimes: {},
      },
    ],
    [
      'games',
      {
        cards: [],
        bestTimes: Object.fromEntries(
          Array.from({ length: MAX_GAMES + 1 }, (_, i) => [`game-${i}`, 1000])
        ),
      },
    ],
  ])(
    'refuses more %s in one request than a person may keep (413)',
    async (_name, body) => {
      const { sync, repo } = setup();
      const response = await sync('student', body);
      expect(response.status).toBe(413);
      expect(((await response.json()) as Json).error).toBe('too_many');
      expect(repo.stored.size).toBe(0);
    }
  );

  it('refuses a body past the size limit (413)', async () => {
    const { sync } = setup();
    const response = await sync('student', 'x'.repeat(MAX_BODY_BYTES + 1));
    expect(response.status).toBe(413);
  });
});

describe('progress merge', () => {
  it('is idempotent and keeps one version per card id', () => {
    const deck = { cards: [card('a', 1), card('a', 2)], bestTimes: { g: 5 } };
    const once = mergeProgress({ cards: [], bestTimes: {} }, deck);
    expect(once.cards).toEqual([card('a', 2)]);
    expect(mergeProgress(once, once)).toEqual(once);
  });

  it('leaves cards up to now as they are', () => {
    const deck = { cards: [card('a', NOW)], bestTimes: {} };
    expect(clampToNow(deck, NOW)).toEqual(deck);
  });
});
