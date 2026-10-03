/**
 * The languages ʿArḍa speaks (ADR-0020): interface, sign-in mail and the language the
 * teacher's words reach a student in. German is the default and the source text.
 */
export const LANGUAGES = ['de', 'en', 'fr', 'ar'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'de';

/** English names, for prompts and logs. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  de: 'German',
  en: 'English',
  fr: 'French',
  ar: 'Arabic',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * The best supported language of an Accept-Language header ("fr-CH,fr;q=0.9,en;q=0.8"),
 * by quality; null when none is supported.
 */
export function fromAcceptLanguage(header: string | null | undefined): Language | null {
  if (!header) return null;
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.map((p) => /^\s*q=([\d.]+)\s*$/.exec(p)?.[1]).find(Boolean);
      return { base: tag.toLowerCase().split('-')[0], q: q ? Number(q) : 1, index };
    })
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return ranked.map((entry) => entry.base).find(isLanguage) ?? null;
}
