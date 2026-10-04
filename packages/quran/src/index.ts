/**
 * @arda/quran: the muṣḥaf's structure (ADR-0007). Pure TypeScript without I/O, shared by the
 * web app and the api. The text itself comes in content packs (ADR-0010), not from here.
 */
export { SURAS, sura, type Sura } from './suras';
export { isAyaRange, type AyaRange } from './range';
