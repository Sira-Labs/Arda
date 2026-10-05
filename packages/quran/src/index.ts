/**
 * @arda/quran: the muṣḥaf's structure (ADR-0007). Pure TypeScript without I/O, shared by the
 * web app and the api. The text itself comes in content packs (ADR-0010), not from here.
 */
export { SURAS, sura, type Sura } from './suras';
export { hasWords, isAyaRange, type AyaRange, type WordBounds } from './range';
export { wordCount } from './words';
export { MADINA_PAGES, madinaPage, madinaPageStart } from './pages';
export { JUZ_NAMES, JUZ_STARTS, juzOf } from './juz';
export {
  wordKey,
  type Pack,
  type PackAya,
  type PackIndex,
  type PackIndexEntry,
  type PackSource,
  type PackSpan,
  type PackSura,
  type PackWord,
} from './pack';
