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
import { CATALOGS, type Messages } from './messages';

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
  const [language, setLocal] = useState<Language>(() => initialLanguage());

  // The account's language wins once known; a first sign-in adopts this device's choice.
  useEffect(() => {
    if (!me) return;
    if (me.language && me.language !== language) {
      setLocal(me.language);
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
      setLocal(next);
      store(next);
      if (me) {
        void client.saveLanguage(next).then((result) => {
          if (!result.ok) log.warn('language not saved', { code: result.code });
        });
      }
    },
    [client, me]
  );

  const value = useMemo(
    () => ({ language, dir: directionOf(language), m: CATALOGS[language], setLanguage }),
    [language, setLanguage]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
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
