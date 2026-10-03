/**
 * The languages of the interface (ADR-0020). German is the default and the source text that
 * the sheikh reviews; Arabic turns the whole document right to left.
 */
export const LANGUAGES = ['de', 'en', 'fr', 'ar'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'de';

/** Each language in its own name, for the picker. */
export const NATIVE_NAMES: Record<Language, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export function directionOf(language: Language): 'ltr' | 'rtl' {
  return language === 'ar' ? 'rtl' : 'ltr';
}

/** The first supported language among the browser's preferences ("fr-CH" → "fr"). */
export function fromBrowser(preferences: readonly string[]): Language | null {
  for (const tag of preferences) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLanguage(base)) return base;
  }
  return null;
}
