/**
 * The catalogs, one language at a time (spec 01 §6, first load). German is the default and
 * the source text and ships with the app; the others are fetched when someone reads in them.
 * The service worker precaches them all, so a language chosen once also works offline.
 */
import { logger } from '@/services/logger';
import type { Language } from './languages';
import { de, type Messages } from './messages/de';

const log = logger.child('i18n');

const loaders: Record<Exclude<Language, 'de'>, () => Promise<Messages>> = {
  en: () => import('./messages/en').then((module) => module.en),
  fr: () => import('./messages/fr').then((module) => module.fr),
  ar: () => import('./messages/ar').then((module) => module.ar),
};

type Fetch = (language: Exclude<Language, 'de'>) => Promise<Messages>;
const fromChunks: Fetch = (language) => loaders[language]();
let fetchCatalog = fromChunks;

const loaded = new Map<Language, Messages>([['de', de]]);
const loading = new Map<Language, Promise<Messages>>();

/** The catalog of a language if it is here already. */
export function catalogOf(language: Language): Messages | undefined {
  return loaded.get(language);
}

/**
 * The catalog of a language, fetched once. Rejects when it cannot be fetched (offline before
 * the service worker has it); the caller then stays with the language it has.
 */
export function loadCatalog(language: Language): Promise<Messages> {
  const here = loaded.get(language);
  if (here) return Promise.resolve(here);
  const pending = loading.get(language);
  if (pending) return pending;
  const load = fetchCatalog(language as Exclude<Language, 'de'>)
    .then((catalog) => {
      loaded.set(language, catalog);
      return catalog;
    })
    .catch((error: unknown) => {
      log.warn('catalog not loaded', { language, name: (error as Error).name });
      throw error;
    })
    .finally(() => loading.delete(language));
  loading.set(language, load);
  return load;
}

/** Puts catalogs in place without fetching: the tests read every language at once. */
export function provideCatalogs(catalogs: Partial<Record<Language, Messages>>): void {
  for (const [language, catalog] of Object.entries(catalogs)) {
    loaded.set(language as Language, catalog);
  }
}

/**
 * Back to what a first visit has: German only. For tests of the fetching itself, which may
 * put their own fetch in place of the chunks (slow, failing, out of order).
 */
export function forgetCatalogsForTests(fetch: Fetch = fromChunks): void {
  loaded.clear();
  loaded.set('de', de);
  loading.clear();
  fetchCatalog = fetch;
}
