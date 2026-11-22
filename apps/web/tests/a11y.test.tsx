import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import type { PackIndex } from '@arda/quran';
import axe from 'axe-core';
import {
  RouterProvider,
  createMemoryRouter,
  matchPath,
  type RouteObject,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/App';
import type { PackLoaderDeps } from '@/content/packs';
import { PackLoaderContext } from '@/modules/mushaf/usePack';
import type { Me } from '@/services/auth';
import { fakeApi, Providers } from './render';

const PATHS = [
  '/',
  '/anmelden',
  '/konto',
  '/pfad',
  '/lernplan',
  '/abzeichen',
  '/mushaf',
  '/mushaf/seite/582',
  '/mushaf/78',
  '/labor',
  '/labor/ra',
  '/labor/ra/quiz',
  '/pfad/2/izhar',
  '/pfad/2/spiel/welche-regel',
  '/pfad/2/spiel/sortieren',
  '/pfad/3/spiel/welche-regel',
  '/pfad/3/spiel/ghunna-halten',
  '/pfad/4/spiel/buchstaben',
  '/pfad/5/spiel/wie-lang',
  '/pfad/6/spiel/schwer-oder-leicht',
  '/pfad/7/spiel/anhalten',
  '/pfad/7/spiel/zeichen',
  '/pfad/8/spiel/was-aendert-warsh',
  '/pfad/8/spiel/hafs-oder-warsh',
  '/pfad/2/test',
  '/pfad/wiederholen',
  '/sheikh',
  '/beitreten',
  '/gibt-es-nicht',
];

const HALAQA = '22222222-2222-4222-8222-222222222222';
const PACKS = resolve(__dirname, '../public/packs');

/** The packs the app ships, served from the repository; nothing is kept between screens. */
const shippedPacks: PackLoaderDeps = {
  index: JSON.parse(readFileSync(resolve(PACKS, 'index.json'), 'utf8')) as PackIndex,
  fetch: async (url) =>
    new Response(
      new Uint8Array(readFileSync(resolve(PACKS, url.replace('/packs/', ''))))
    ),
  cache: async () => null,
  sha256: async (data) => createHash('sha256').update(new Uint8Array(data)).digest('hex'),
};

/** A ḥalaqa as its teacher sees it: one student active, one waiting. */
const halaqaView = {
  [`GET /api/v1/halaqat/${HALAQA}`]: () =>
    Response.json({
      role: 'teacher',
      halaqa: {
        id: HALAQA,
        name: 'Juzʾ ʿAmma',
        oneToOne: false,
        teacherName: 'Person',
        createdAt: '2026-10-03T12:00:00Z',
      },
      members: ['active', 'pending'].map((status, i) => ({
        userId: `s${i}`,
        name: `Student ${i}`,
        email: `s${i}@example.org`,
        role: 'student',
        status,
        joinedAt: '2026-10-03T12:00:00Z',
      })),
    }),
  [`GET /api/v1/halaqat/${HALAQA}/assignments`]: () =>
    Response.json({ role: 'teacher', assignments: [], more: false }),
};

/** The screens a signed-in person sees differently. */
const SIGNED_IN = [
  '/',
  '/konto',
  '/lernplan',
  '/abzeichen',
  '/sheikh',
  `/halaqa/${HALAQA}`,
  '/verwaltung',
];

/** Every path pattern of the route table, layouts left out. */
function patterns(table: RouteObject[]): string[] {
  return table.flatMap((route) => [
    ...(route.path ? [route.path] : []),
    ...patterns(route.children ?? []),
  ]);
}

const person = (role: Me['role']): Me => ({
  id: '11111111-1111-4111-8111-111111111111',
  email: 'person@example.org',
  name: 'Person',
  role,
  timeZone: null,
  language: null,
});

/** Renders the app at a path and returns what axe finds there, one line per rule. */
async function check(
  path: string,
  me: Me | null = null,
  given: {
    answers?: Parameters<typeof fakeApi>[0];
    /** What shows that the screen has its content, awaited before it is checked. */
    ready?: () => Promise<unknown>;
  } = {}
): Promise<string[]> {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const { container } = render(
    <Providers client={fakeApi(given.answers ?? {}, me).client}>
      <PackLoaderContext.Provider value={shippedPacks}>
        <RouterProvider router={router} />
      </PackLoaderContext.Provider>
    </Providers>
  );
  // Every screen opens with one main heading (WCAG 2.4.6), also when it has nothing to show.
  await given.ready?.();
  await screen.findByRole('heading', { level: 1 });
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  // What jsdom cannot lay out (contrast, target size) is checked on the tokens below and by hand.
  const results = await axe.run(container, {
    runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`
  );
}

describe('accessibility (WCAG 2.2 AA, spec 01 §6)', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(cleanup);

  it('opens every route of the app at least once', () => {
    // A new screen fails here until a path for it is in one of the lists above.
    const tested = [...PATHS, ...SIGNED_IN];
    const specific = patterns(routes).filter((pattern) => pattern !== '*');
    for (const pattern of specific) {
      expect(
        tested.some((path) => matchPath(pattern, path)),
        pattern
      ).toBe(true);
    }
    // And the catch-all with a path nothing else takes.
    expect(tested.some((path) => !specific.some((p) => matchPath(p, path)))).toBe(true);
  });

  for (const language of ['de', 'ar']) {
    for (const path of PATHS) {
      it(`${path} (${language})`, async () => {
        localStorage.setItem('arda.language', language);
        expect(await check(path)).toEqual([]);
      });
    }
  }

  it('the muṣḥaf page with its words, once the pack is there', async () => {
    localStorage.setItem('arda.language', 'de');
    expect(
      await check('/mushaf/78', null, { ready: () => screen.findByText(/^Seite \d+ · /) })
    ).toEqual([]);
    expect(document.querySelectorAll('.mushaf-word').length).toBeGreaterThan(20);
  });

  it('a ḥalaqa as its teacher sees it', async () => {
    localStorage.setItem('arda.language', 'de');
    expect(
      await check(`/halaqa/${HALAQA}`, person('teacher'), {
        answers: halaqaView,
        ready: () => screen.findByRole('heading', { name: 'Juzʾ ʿAmma' }),
      })
    ).toEqual([]);
  });

  it('the account page with the opt-in to measure the check, offered and unreadable', async () => {
    localStorage.setItem('arda.language', 'de');
    const title = () =>
      screen.findByRole('heading', { level: 2, name: 'Automatische Prüfung messen' });
    expect(
      await check('/konto', person('student'), {
        answers: {
          'GET /api/v1/speech/evaluation': () =>
            Response.json({ available: true, optedIn: false, since: null }),
        },
        ready: title,
      })
    ).toEqual([]);
    cleanup();
    expect(
      await check('/konto', person('student'), {
        answers: {
          'GET /api/v1/speech/evaluation': () =>
            Response.json({ error: 'internal' }, { status: 500 }),
        },
        ready: title,
      })
    ).toEqual([]);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  for (const role of ['student', 'teacher', 'admin'] as const) {
    for (const path of SIGNED_IN) {
      it(`${path} as ${role}`, async () => {
        localStorage.setItem('arda.language', 'de');
        expect(await check(path, person(role))).toEqual([]);
      });
    }
  }
});
