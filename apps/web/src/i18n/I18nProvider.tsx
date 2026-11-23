/**
 * The interface language (ADR-0020). Order: the signed-in person's stored language, else the
 * one chosen on this device, else the browser's, else German. Changing it updates the
 * document (`lang`, `dir`), this device, and — when signed in — the account, so mails and the
 * teacher's translated words follow.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { logger } from '@/services/logger';
import { useSession } from '@/state/session';
import {
  DEFAULT_LANGUAGE,
  directionOf,
  fromBrowser,
  isLanguage,
  type Language,
} from './languages';
import { catalogOf, loadCatalog } from './catalogs';
import type { Messages } from './messages/de';

const log = logger.child('i18n');
const STORAGE_KEY = 'arda.language';

export interface I18nState {
  language: Language;
  dir: 'ltr' | 'rtl';
  /** The catalog of the current language. */
  m: Messages;
  setLanguage(language: Language): void;
}

const I18nContext = createContext<I18nState | null>(null);

function readStored(): Language | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch (error) {
    log.debug('language storage unavailable', { name: (error as Error).name });
    return null;
  }
}

function store(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch (error) {
    log.debug('language storage unavailable', { name: (error as Error).name });
  }
}

export function initialLanguage(): Language {
  return (
    readStored() ??
    fromBrowser(typeof navigator === 'undefined' ? [] : navigator.languages) ??
    DEFAULT_LANGUAGE
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { me, client } = useSession();
  // The language shown: the wanted one once its catalog is here (`main.tsx` fetches the
  // first before anything is drawn), German until then.
  const [language, setShown] = useState<Language>(() => {
    const wanted = initialLanguage();
    return catalogOf(wanted) ? wanted : DEFAULT_LANGUAGE;
  });
  /** Shows a language: at once when its catalog is here, else as soon as it has arrived. */
  const show = useCallback((next: Language) => {
    if (catalogOf(next)) return setShown(next);
    // A catalog that cannot be fetched leaves the language as it is (logged by the loader).
    void loadCatalog(next).then(
      () => setShown(next),
      () => undefined
    );
  }, []);
  useEffect(() => {
    const wanted = initialLanguage();
    if (!catalogOf(wanted)) show(wanted);
  }, [show]);

  // The account's language wins once known; a first sign-in adopts this device's choice.
  useEffect(() => {
    if (!me) return;
    if (me.language && me.language !== language) {
      show(me.language);
      store(me.language);
    } else if (!me.language) {
      void client.saveLanguage(language);
    }
    // Only when the profile changes; a local choice is saved by setLanguage below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, me?.language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = directionOf(language);
  }, [language]);

  const setLanguage = useCallback(
    (next: Language) => {
      show(next);
      store(next);
      if (me) {
        void client.saveLanguage(next).then((result) => {
          if (!result.ok) log.warn('language not saved', { code: result.code });
        });
      }
    },
    [client, me, show]
  );

  const value = useMemo(
    () => ({
      language,
      dir: directionOf(language),
      // The language shown always has its catalog; German is the floor.
      m: catalogOf(language) ?? catalogOf(DEFAULT_LANGUAGE)!,
      setLanguage,
    }),
    [language, setLanguage]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * The catalog of another language than the one shown (the sheikh previews his remark in the
 * student's), fetched when first asked for; undefined until it is here.
 */
export function useCatalog(language: Language): Messages | undefined {
  const [, arrived] = useState(0);
  useEffect(() => {
    if (catalogOf(language)) return;
    let current = true;
    void loadCatalog(language).then(
      () => current && arrived((n) => n + 1),
      () => undefined
    );
    return () => {
      current = false;
    };
  }, [language]);
  return catalogOf(language);
}

export function useI18n(): I18nState {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n needs an I18nProvider');
  return value;
}

/** A failed request's code in the reader's language. */
export function errorMessage(
  m: Messages,
  failure: { status: number; code: string }
): string {
  const known = (m.errors as Record<string, unknown>)[failure.code];
  return typeof known === 'string' ? known : m.errors.generic(failure.status);
}
