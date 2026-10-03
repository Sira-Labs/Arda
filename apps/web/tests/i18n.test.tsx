import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useI18n } from '@/i18n/I18nProvider';
import { fromBrowser } from '@/i18n/languages';
import { LanguagePicker } from '@/i18n/LanguagePicker';
import { CATALOGS } from '@/i18n/messages';
import { fakeApi, Providers } from './render';

/** Every leaf of a catalog as "path → kind", so structures can be compared across languages. */
function shape(value: unknown, path = ''): string[] {
  if (typeof value === 'function') return [`${path}:fn`];
  if (Array.isArray(value)) return [`${path}:array${value.length}`];
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([key, v]) => shape(v, `${path}.${key}`));
  }
  return [`${path}:${typeof value}`];
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('catalogs (ADR-0020)', () => {
  it('have the same messages in every language, none empty', () => {
    const german = shape(CATALOGS.de);
    for (const [language, catalog] of Object.entries(CATALOGS)) {
      expect(shape(catalog), language).toEqual(german);
      for (const text of strings(catalog)) expect(text.trim(), language).not.toBe('');
    }
  });

  it('keep tajwīd terms as terms', () => {
    expect(CATALOGS.en.rules.ghunna.name).toBe('Ghunna');
    expect(CATALOGS.fr.rules.qalqala.name).toBe('Qalqala');
    expect(CATALOGS.ar.rules.ghunna.name).toBe('غنة');
  });

  it('map browser preferences to a supported language', () => {
    expect(fromBrowser(['fr-CH', 'de'])).toBe('fr');
    expect(fromBrowser(['tr', 'ar-EG'])).toBe('ar');
    expect(fromBrowser(['ja'])).toBeNull();
  });
});

function Probe() {
  const { m, dir } = useI18n();
  return (
    <p>
      {m.nav.today} · {dir}
    </p>
  );
}

describe('I18nProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('arda.language', 'de');
  });

  it('switches the whole document to Arabic, right to left, and remembers it', async () => {
    const { client } = fakeApi({});
    render(
      <Providers client={client}>
        <LanguagePicker />
        <Probe />
      </Providers>
    );
    expect(screen.getByText('Heute · ltr')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ar');
    expect(screen.getByText('اليوم · rtl')).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(localStorage.getItem('arda.language')).toBe('ar');
  });

  it('follows the signed-in person’s language and saves a new choice to the account', async () => {
    const { client, calls } = fakeApi(
      { '/api/v1/account/settings': new Response(null, { status: 204 }) },
      {
        id: 'u',
        email: 'a@example.org',
        name: null,
        role: 'student',
        timeZone: null,
        language: 'en',
      }
    );
    render(
      <Providers client={client}>
        <LanguagePicker />
        <Probe />
      </Providers>
    );
    expect(await screen.findByText('Today · ltr')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox'), 'fr');
    await waitFor(() =>
      expect(calls.filter((c) => c.path === '/api/v1/account/settings')).toEqual([
        { path: '/api/v1/account/settings', method: 'PATCH', body: { language: 'fr' } },
      ])
    );
  });

  it('gives a first-time account the language chosen on this device', async () => {
    localStorage.setItem('arda.language', 'ar');
    const signedIn = fakeApi(
      { '/api/v1/account/settings': new Response(null, { status: 204 }) },
      {
        id: 'u',
        email: 'a@example.org',
        name: null,
        role: 'student',
        timeZone: null,
        language: null,
      }
    );
    render(
      <Providers client={signedIn.client}>
        <Probe />
      </Providers>
    );
    await waitFor(() =>
      expect(
        signedIn.calls.find((c) => c.path === '/api/v1/account/settings')?.body
      ).toEqual({
        language: 'ar',
      })
    );
  });
});
