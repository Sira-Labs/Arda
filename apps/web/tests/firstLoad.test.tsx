import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '@/App';
import {
  catalogOf,
  forgetCatalogsForTests,
  loadCatalog,
  provideCatalogs,
} from '@/i18n/catalogs';
import { useI18n } from '@/i18n/I18nProvider';
import { CATALOGS } from '@/i18n/messages';
import { REMARKS } from '@/modules/recite/remarks';
import { ScreenError } from '@/modules/ScreenError';
import { FeedbackComposer } from '@/modules/sheikh/FeedbackComposer';
// The budget is a build script; its two functions are plain JavaScript.
import { LIMITS, measure, over } from '../scripts/budget.mjs';
import { fakeApi, Providers } from './render';

function Probe() {
  const { m, language, dir, setLanguage } = useI18n();
  return (
    <div>
      <p data-testid="language">{`${language} ${dir}`}</p>
      <p>{m.nav.today}</p>
      {(['de', 'fr', 'ar'] as const).map((to) => (
        <button key={to} type="button" onClick={() => setLanguage(to)}>
          {to}
        </button>
      ))}
    </div>
  );
}

const show = () =>
  render(
    <Providers client={fakeApi({}).client}>
      <Probe />
    </Providers>
  );

describe('catalogs on demand (spec 01 §6, first load)', () => {
  beforeEach(() => {
    localStorage.clear();
    forgetCatalogsForTests();
  });
  // Every other test reads all four languages at once.
  afterEach(() => {
    forgetCatalogsForTests();
    provideCatalogs(CATALOGS);
  });

  it('ships German and fetches another language once', async () => {
    expect(catalogOf('de')).toBe(CATALOGS.de);
    expect(catalogOf('ar')).toBeUndefined();
    const [first, second] = [loadCatalog('ar'), loadCatalog('ar')];
    expect(first).toBe(second);
    expect(await first).toBe(CATALOGS.ar);
    expect(catalogOf('ar')).toBe(CATALOGS.ar);
  });

  it('starts in German and turns to the reader’s language when its catalog arrives', async () => {
    localStorage.setItem('arda.language', 'ar');
    show();
    expect(screen.getByTestId('language')).toHaveTextContent('de ltr');
    expect(screen.getByText(CATALOGS.de.nav.today)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('language')).toHaveTextContent('ar rtl')
    );
    expect(screen.getByText(CATALOGS.ar.nav.today)).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('starts in the reader’s language when its catalog is already here', async () => {
    localStorage.setItem('arda.language', 'en');
    await loadCatalog('en');
    show();
    expect(screen.getByTestId('language')).toHaveTextContent('en ltr');
  });

  it('keeps the language shown until a newly chosen one has arrived, and remembers the choice', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: 'fr' }));
    expect(localStorage.getItem('arda.language')).toBe('fr');
    await waitFor(() =>
      expect(screen.getByTestId('language')).toHaveTextContent('fr ltr')
    );
    expect(screen.getByText(CATALOGS.fr.nav.today)).toBeInTheDocument();
  });
});

describe('catalogs that arrive late, out of order or not at all', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    forgetCatalogsForTests();
    provideCatalogs(CATALOGS);
  });

  function byHand() {
    const waiting = new Map<string, { arrive(): void; fail(): void }>();
    forgetCatalogsForTests(
      (language) =>
        new Promise((resolve, reject) => {
          waiting.set(language, {
            arrive: () => resolve(CATALOGS[language]),
            fail: () => reject(new TypeError('Failed to fetch')),
          });
        })
    );
    return waiting;
  }
  const shown = () => screen.getByTestId('language').textContent;
  const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

  it('shows the language chosen last, whichever catalog arrives last', async () => {
    const waiting = byHand();
    show();
    await userEvent.click(screen.getByRole('button', { name: 'fr' }));
    await userEvent.click(screen.getByRole('button', { name: 'ar' }));
    waiting.get('ar')!.arrive();
    await waitFor(() => expect(shown()).toBe('ar rtl'));
    waiting.get('fr')!.arrive();
    await settle();
    expect(shown()).toBe('ar rtl');
    expect(localStorage.getItem('arda.language')).toBe('ar');
  });

  it('stays with a language chosen from what is here when an earlier catalog arrives', async () => {
    const waiting = byHand();
    localStorage.setItem('arda.language', 'de');
    show();
    await userEvent.click(screen.getByRole('button', { name: 'fr' }));
    await userEvent.click(screen.getByRole('button', { name: 'de' }));
    waiting.get('fr')!.arrive();
    await settle();
    expect(shown()).toBe('de ltr');
    expect(localStorage.getItem('arda.language')).toBe('de');
  });

  it('keeps the language shown when the chosen one cannot be fetched', async () => {
    const waiting = byHand();
    localStorage.setItem('arda.language', 'de');
    show();
    await userEvent.click(screen.getByRole('button', { name: 'fr' }));
    waiting.get('fr')!.fail();
    await settle();
    expect(shown()).toBe('de ltr');
  });

  it('tells the sheikh when the other language’s words cannot be fetched, and tries again', async () => {
    const waiting = byHand();
    localStorage.setItem('arda.language', 'de');
    render(
      <Providers client={fakeApi({}).client}>
        <FeedbackComposer />
      </Providers>
    );
    // German to Arabic: the buttons are German already, the preview waits for Arabic.
    const remark = screen.getByRole('button', { name: CATALOGS.de.remarks[REMARKS[0]!] });
    expect(remark).toHaveAttribute('lang', 'de');
    await userEvent.click(remark);
    waiting.get('ar')!.fail();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Diese Sprache lädt gerade nicht.'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Noch einmal versuchen' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    await act(async () => waiting.get('ar')!.arrive());
    expect(await screen.findByText(CATALOGS.ar.remarks[REMARKS[0]!])).toHaveAttribute(
      'dir',
      'rtl'
    );
  });

  it('labels the quick remarks in the language they are written in while the sheikh’s loads', async () => {
    const waiting = byHand();
    localStorage.setItem('arda.language', 'de');
    render(
      <Providers client={fakeApi({}).client}>
        <FeedbackComposer />
      </Providers>
    );
    const [from] = screen.getAllByRole('combobox');
    await userEvent.selectOptions(from!, 'fr');
    const german = screen.getByRole('button', { name: CATALOGS.de.remarks[REMARKS[0]!] });
    expect(german).toHaveAttribute('lang', 'de');
    await act(async () => waiting.get('fr')!.arrive());
    expect(
      await screen.findByRole('button', { name: CATALOGS.fr.remarks[REMARKS[0]!] })
    ).toHaveAttribute('lang', 'fr');
  });
});

describe('a screen that cannot be fetched', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('arda.language', 'de');
  });

  it('says so and offers to load the app again', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    const router = createMemoryRouter(
      [
        {
          errorElement: <ScreenError />,
          children: [
            {
              path: '/',
              lazy: () =>
                Promise.reject(
                  new TypeError('Failed to fetch dynamically imported module')
                ),
            },
          ],
        },
      ],
      { initialEntries: ['/'] }
    );
    render(
      <Providers client={fakeApi({}).client}>
        <RouterProvider router={router} />
      </Providers>
    );
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Diese Seite lädt gerade nicht',
      })
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('offline');
    await userEvent.click(screen.getByRole('button', { name: 'Neu laden' }));
    expect(reload).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('is the roof over every route of the app', () => {
    expect(routes).toHaveLength(1);
    expect(routes[0]!.errorElement).toBeTruthy();
  });
});

describe('the first-load budget (scripts/budget.mjs)', () => {
  const fine = {
    entryScript: 170 * 1024,
    entryStyle: 7 * 1024,
    catalogs: { en: 23 * 1024, fr: 25 * 1024, ar: 25 * 1024 },
  };

  it('passes a build within its limits', () => {
    expect(over(fine)).toEqual([]);
  });

  it('counts what the page preloads with its script, each file once', () => {
    const dist = mkdtempSync(join(tmpdir(), 'arda-budget-'));
    mkdirSync(join(dist, 'assets'));
    const noise = (bytes: number) => randomBytes(bytes);
    writeFileSync(join(dist, 'assets/index-a.js'), noise(4000));
    writeFileSync(join(dist, 'assets/vendor-b.js'), noise(3000));
    writeFileSync(join(dist, 'assets/Lab-c.js'), noise(9000));
    writeFileSync(join(dist, 'assets/index-d.css'), noise(1000));
    for (const language of ['en', 'fr', 'ar']) {
      writeFileSync(join(dist, `assets/${language}-x.js`), noise(500));
    }
    writeFileSync(
      join(dist, 'index.html'),
      `<script type="module" crossorigin src="/assets/index-a.js"></script>
       <link rel="modulepreload" crossorigin href="/assets/vendor-b.js">
       <link rel="modulepreload" crossorigin href="/assets/index-a.js">
       <link rel="stylesheet" crossorigin href="/assets/index-d.css">`
    );
    const sizes = measure(pathToFileURL(`${dist}/`));
    // Random bytes do not shrink: entry and preload count, the lazy screen does not.
    expect(sizes.entryScript).toBeGreaterThan(7000);
    expect(sizes.entryScript).toBeLessThan(7200);
    expect(sizes.entryStyle).toBeGreaterThan(1000);
    expect(Object.keys(sizes.catalogs).sort()).toEqual(['ar', 'en', 'fr']);
    rmSync(dist, { recursive: true });
  });

  it('names what grew past its limit', () => {
    expect(over({ ...fine, entryScript: (LIMITS.entryScript + 1) * 1024 })).toEqual([
      `entry script: ${LIMITS.entryScript + 1} kB gzip, limit ${LIMITS.entryScript} kB`,
    ]);
    expect(over({ ...fine, catalogs: { ...fine.catalogs, ar: 31 * 1024 } })).toHaveLength(
      1
    );
  });

  it('notices a catalog that went back into the entry', () => {
    expect(over({ ...fine, catalogs: { en: 1, fr: 1 } })).toEqual([
      'catalogs on demand: en, fr, expected en, fr, ar',
    ]);
  });
});
