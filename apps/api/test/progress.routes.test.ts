import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Actor } from '../src/authz/policies.js';
import {
  clampToNow,
  MAX_CARDS,
  MAX_GAMES,
  MAX_NOTES,
  mergeProgress,
  type NoteKind,
  type ProgressCard,
  type StudyNote,
} from '../src/progress/repository.js';
import { EVENT_PAGE, MAX_EVENTS_PER_REQUEST } from '../src/progress/repository.js';
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

/** A finished round of Which rule? (ADR-0023). */
const ev = (n: number, at = NOW - 60_000) => ({
  id: `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  kind: 'which-rule',
  ref: '',
  at,
  right: 8,
  total: 10,
});

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

const NOTE_IDS = [
  '50000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000002',
  '50000000-0000-4000-8000-000000000003',
] as const;

/** A note in "Mein Lernplan", written at `at`. */
const note = (kind: NoteKind, at: number, over: Partial<StudyNote> = {}): StudyNote => ({
  id: NOTE_IDS[0],
  kind,
  text: 'Etwas lernen',
  range: null,
  pages: null,
  done: false,
  deleted: false,
  createdAt: at,
  updatedAt: at,
  ...over,
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
  /** A deck sent by `actor` as their own (the `userId` the web app adds), unless it names one. */
  const sync = (actor: string, body: unknown) =>
    app.request('/api/v1/progress/sync', {
      method: 'POST',
      headers: { 'x-test-actor': actor, 'content-type': 'application/json' },
      body:
        typeof body === 'string'
          ? body
          : JSON.stringify({
              userId: ACTORS[actor]?.id ?? 'nobody',
              ...(body as object),
            }),
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
    expect(body).toEqual({
      cards: [],
      bestTimes: {},
      places: [],
      notes: [],
      events: [],
      more: false,
    });
  });

  it("refuses a deck sent as another account's, and stores nothing (409)", async () => {
    // The session cookie changed (a sign-in in another tab) while the deck was on its way.
    const { sync, repo } = setup();
    const response = await sync('student', {
      userId: ACTORS.other!.id,
      cards: [card('a', NOW)],
      bestTimes: {},
    });
    expect(response.status).toBe(409);
    expect(((await response.json()) as Json).error).toBe('other_account');
    expect(repo.stored.size).toBe(0);
  });

  it('keeps the later reading place per script', async () => {
    const { sync } = setup();
    await sync('student', {
      cards: [],
      bestTimes: {},
      places: [{ script: 'indopak', page: 9, at: NOW - 5000 }],
    });
    const body: Json = await (
      await sync('student', {
        cards: [],
        bestTimes: {},
        places: [
          { script: 'indopak', page: 8, at: NOW - 9000 },
          { script: 'uthmani', page: 604, at: NOW + 60_000 },
        ],
      })
    ).json();
    expect(body.places).toEqual([
      { script: 'indopak', page: 9, at: NOW - 5000 },
      { script: 'uthmani', page: 604, at: NOW },
    ]);
  });

  it('keeps the later version of each study note, and a deleted one without its text', async () => {
    const { sync } = setup();
    const learn = note('learn', NOW - 9000, {
      text: 'Zwei Seiten al-Baqara',
      pages: { layout: 'indopak-15', from: 8, to: 9 },
    });
    const hard = note('difficulty', NOW - 9000, {
      id: NOTE_IDS[1],
      text: 'Das ḍād klingt wie dāl',
      range: { sura: 2, from: 1, to: 5 },
    });
    await sync('student', { cards: [], bestTimes: {}, notes: [learn, hard] });
    const body: Json = await (
      await sync('student', {
        cards: [],
        bestTimes: {},
        notes: [
          // Older than the stored one: the stored one stays.
          { ...learn, text: 'Eine Seite', updatedAt: NOW - 20_000 },
          // Deleted later, with its text still on the device: kept as a tombstone.
          { ...hard, deleted: true, updatedAt: NOW - 1000 },
          note('review', NOW + 60_000, { id: NOTE_IDS[2], text: 'al-Mulk wiederholen' }),
        ],
      })
    ).json();
    expect(body.notes).toEqual([
      learn,
      { ...hard, deleted: true, text: '', range: null, updatedAt: NOW - 1000 },
      expect.objectContaining({ kind: 'review', createdAt: NOW, updatedAt: NOW }),
    ]);
    // Another person sees none of them.
    const other: Json = await (await sync('other', { cards: [], bestTimes: {} })).json();
    expect(other.notes).toEqual([]);
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
    ['no account named', '{"cards":[],"bestTimes":{}}'],
    ['an unknown field', { cards: [], bestTimes: {}, xp: 5 }],
    ['a box outside 1–5', { cards: [{ ...card('a', NOW), box: 6 }], bestTimes: {} }],
    ['a negative time', { cards: [{ ...card('a', NOW), due: -1 }], bestTimes: {} }],
    [
      'an odd kind',
      { cards: [{ ...card('a', NOW), kind: 'DROP TABLE' }], bestTimes: {} },
    ],
    ['a game time of zero', { cards: [], bestTimes: { 'sort-28': 0 } }],
    ['an odd game name', { cards: [], bestTimes: { 'Sort 28': 5 } }],
    [
      'an event of an unknown kind',
      { cards: [], bestTimes: {}, events: [{ ...ev(1), kind: 'cheat' }] },
    ],
    [
      'more right than asked',
      { cards: [], bestTimes: {}, events: [{ ...ev(1), right: 11 }] },
    ],
    [
      'an event without an id',
      { cards: [], bestTimes: {}, events: [{ ...ev(1), id: 'x' }] },
    ],
    ['a negative sequence number', { cards: [], bestTimes: {}, since: -1 }],
    [
      'a reading place in an unknown script',
      { cards: [], bestTimes: {}, places: [{ script: 'warsh', page: 1, at: NOW }] },
    ],
    [
      'a reading place on page 0',
      { cards: [], bestTimes: {}, places: [{ script: 'indopak', page: 0, at: NOW }] },
    ],
    [
      'a note without text',
      { cards: [], bestTimes: {}, notes: [note('learn', NOW, { text: '   ' })] },
    ],
    [
      'a note of an unknown kind',
      { cards: [], bestTimes: {}, notes: [{ ...note('learn', NOW), kind: 'todo' }] },
    ],
    [
      'a note on āyāt that do not exist',
      {
        cards: [],
        bestTimes: {},
        notes: [note('learn', NOW, { range: { sura: 112, from: 1, to: 5 } })],
      },
    ],
    [
      'a note on both āyāt and pages',
      {
        cards: [],
        bestTimes: {},
        notes: [
          note('learn', NOW, {
            range: { sura: 2, from: 1, to: 5 },
            pages: { layout: 'madina', from: 2, to: 2 },
          }),
        ],
      },
    ],
    [
      'a note longer than 500 letters',
      {
        cards: [],
        bestTimes: {},
        notes: [note('learn', NOW, { text: 'x'.repeat(501) })],
      },
    ],
    [
      'more reading places than scripts',
      {
        cards: [],
        bestTimes: {},
        places: [1, 2, 3].map((page) => ({ script: 'indopak', page, at: NOW })),
      },
    ],
  ])('refuses %s (400)', async (_name, body) => {
    const { sync, repo } = setup();
    const response = await sync('student', body);
    expect(response.status).toBe(400);
    expect(((await response.json()) as Json).error).toBe('invalid_body');
    expect(repo.stored.size).toBe(0);
  });

  it('refuses more notes than a person may keep (413)', async () => {
    const { sync, repo } = setup();
    const response = await sync('student', {
      cards: [],
      bestTimes: {},
      notes: Array.from({ length: MAX_NOTES + 1 }, (_, i) =>
        note('learn', NOW, {
          id: `40000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        })
      ),
    });
    expect(response.status).toBe(413);
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

describe('activity log sync (ADR-0023)', () => {
  const none = { cards: [], bestTimes: {} };

  it('stores events once, numbers them and sends each device what it has not seen', async () => {
    const { sync } = setup();
    const phone: Json = await (
      await sync('student', { ...none, events: [ev(1), ev(2)] })
    ).json();
    expect(phone.events.map((e: Json) => [e.id, e.seq])).toEqual([
      [ev(1).id, 1],
      [ev(2).id, 2],
    ]);
    expect(phone.more).toBe(false);
    // The laptop has seen nothing: it gets the phone's events and its own.
    const laptop: Json = await (
      await sync('student', { ...none, events: [ev(3)] })
    ).json();
    expect(laptop.events.map((e: Json) => e.seq)).toEqual([1, 2, 3]);
    // The phone again: only what came after its last number.
    const again: Json = await (await sync('student', { ...none, since: 2 })).json();
    expect(again.events.map((e: Json) => e.id)).toEqual([ev(3).id]);
    // A resent event keeps its number and comes back, so a lost answer costs nothing.
    const resent: Json = await (
      await sync('student', { ...none, since: 3, events: [ev(1)] })
    ).json();
    expect(resent.events.map((e: Json) => [e.id, e.seq])).toEqual([[ev(1).id, 1]]);
  });

  it('keeps each log to its own person', async () => {
    const { sync } = setup();
    await sync('student', { ...none, events: [ev(1)] });
    const other: Json = await (await sync('other', none)).json();
    expect(other.events).toEqual([]);
  });

  it('dates an event from the future as done now', async () => {
    const { sync } = setup();
    const body: Json = await (
      await sync('student', { ...none, events: [ev(1, NOW + 86_400_000)] })
    ).json();
    expect(body.events[0].at).toBe(NOW);
  });

  it('pages a long log', async () => {
    const { sync } = setup();
    for (let from = 0; from <= EVENT_PAGE; from += MAX_EVENTS_PER_REQUEST) {
      const events = Array.from({ length: MAX_EVENTS_PER_REQUEST }, (_, i) =>
        ev(from + i + 1)
      );
      expect((await sync('student', { ...none, since: 1e9, events })).status).toBe(200);
    }
    const first: Json = await (await sync('other', none)).json();
    expect(first.events).toEqual([]);
    const page: Json = await (await sync('student', none)).json();
    expect(page.events).toHaveLength(EVENT_PAGE);
    expect(page.more).toBe(true);
    const rest: Json = await (
      await sync('student', { ...none, since: page.events.at(-1).seq })
    ).json();
    expect(rest.more).toBe(false);
    expect(rest.events.length).toBe(3 * MAX_EVENTS_PER_REQUEST - EVENT_PAGE);
  });

  it('refuses more events in one request than it takes (413)', async () => {
    const { sync, repo } = setup();
    const events = Array.from({ length: MAX_EVENTS_PER_REQUEST + 1 }, (_, i) =>
      ev(i + 1)
    );
    const response = await sync('student', { ...none, events });
    expect(response.status).toBe(413);
    expect(repo.logs.size).toBe(0);
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
