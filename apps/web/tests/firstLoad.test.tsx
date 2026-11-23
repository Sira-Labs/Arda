import { render, screen, waitFor } from '@testing-library/react';
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
import { ScreenError } from '@/modules/ScreenError';
// The budget is a build script; its two functions are plain JavaScript.
import { LIMITS, over } from '../scripts/budget.mjs';
import { fakeApi, Providers } from './render';

function Probe() {
  const { m, language, dir, setLanguage } = useI18n();
  return (
    <div>
      <p data-testid="language">{`${language} ${dir}`}</p>
      <p>{m.nav.today}</p>
      <button type="button" onClick={() => setLanguage('fr')}>
        fr
      </button>
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
  afterEach(() => provideCatalogs(CATALOGS));

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
