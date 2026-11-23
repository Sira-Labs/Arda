import type { Language } from '../languages';
import { ar } from './ar';
import { de, type Messages } from './de';
import { en } from './en';
import { fr } from './fr';

export type { Messages, RemarkId } from './de';

/**
 * Every catalog, typed against the German source (ADR-0020). For tests and tools only: the
 * app takes its catalogs from `../catalogs`, which fetches a language when it is needed.
 */
export const CATALOGS: Record<Language, Messages> = { de, en, fr, ar };
