import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/App';
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

/** The screens a signed-in person sees differently. */
const SIGNED_IN = ['/', '/konto', '/lernplan', '/abzeichen', '/sheikh', '/verwaltung'];

const person = (role: Me['role']): Me => ({
  id: '11111111-1111-4111-8111-111111111111',
  email: 'person@example.org',
  name: 'Person',
  role,
  timeZone: null,
  language: null,
});

/** Renders the app at a path and returns what axe finds there, one line per rule. */
async function check(path: string, me: Me | null = null): Promise<string[]> {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const { container } = render(
    <Providers client={fakeApi({}, me).client}>
      <RouterProvider router={router} />
    </Providers>
  );
  // Every screen has one main heading (WCAG 2.4.6), also while it loads or has nothing to show.
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

  for (const language of ['de', 'ar']) {
    for (const path of PATHS) {
      it(`${path} (${language})`, async () => {
        localStorage.setItem('arda.language', language);
        expect(await check(path)).toEqual([]);
      });
    }
  }

  for (const role of ['student', 'teacher', 'admin'] as const) {
    for (const path of SIGNED_IN) {
      it(`${path} as ${role}`, async () => {
        localStorage.setItem('arda.language', 'de');
        expect(await check(path, person(role))).toEqual([]);
      });
    }
  }
});
