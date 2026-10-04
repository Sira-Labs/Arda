import { sura } from './suras';
import { wordCount } from './words';

/** Consecutive āyāt of one sūra, both ends included: 2:1–5 is `{ sura: 2, from: 1, to: 5 }`. */
export interface AyaRange {
  sura: number;
  from: number;
  to: number;
}

/** Whether the range exists in the muṣḥaf: whole numbers, in one sūra, `from` ≤ `to`. */
export function isAyaRange(range: AyaRange): boolean {
  const s = sura(range.sura);
  return (
    s !== undefined &&
    Number.isInteger(range.from) &&
    Number.isInteger(range.to) &&
    range.from >= 1 &&
    range.from <= range.to &&
    range.to <= s.ayas
  );
}

/** Words of an assignment: from a word of its first āya to a word of its last (S3.2). */
export interface WordBounds {
  from: number;
  to: number;
}

/**
 * Whether the words exist in `range`: `from` is a word of its first āya, `to` a word of its
 * last, and in a single āya `from` comes first.
 */
export function hasWords(range: AyaRange, words: WordBounds): boolean {
  const first = wordCount(range.sura, range.from);
  const last = wordCount(range.sura, range.to);
  return (
    first !== undefined &&
    last !== undefined &&
    Number.isInteger(words.from) &&
    Number.isInteger(words.to) &&
    words.from >= 1 &&
    words.to >= 1 &&
    words.from <= first &&
    words.to <= last &&
    (range.from < range.to || words.from <= words.to)
  );
}
