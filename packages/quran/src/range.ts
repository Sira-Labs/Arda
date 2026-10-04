import { sura } from './suras';

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
