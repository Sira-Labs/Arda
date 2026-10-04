import type { PackRuleId } from '@arda/tajweed';
import type { Annotation } from './cpfair';

/**
 * Re-aligning cpfair's annotations to the current Tanzil text.
 *
 * cpfair indexed Tanzil's text of April 2017; Tanzil 1.1 differs from it by a character or two
 * in some āyāt (in Juzʾ ʿAmma: 19 of 564), so their offsets drift there. The 2017 file is not
 * available any more, and cpfair's classifier carries no licence, so the annotations are moved
 * rather than recomputed: each rule has a signature (the letter it starts on, read off the āyāt
 * that still line up), and an āya is accepted only when every annotation, after the smallest
 * shift, matches its signature. Otherwise the import fails; nothing is guessed silently.
 */

const NUN_OR_TANWIN = new Set(['ن', 'ً', 'ٌ', 'ٍ', 'ۢ']);
const MADD = new Set(['ا', 'و', 'ي', 'ى', 'ٰ', 'ۥ', 'ۦ']);

interface Signature {
  /** Whether the start letter alone pins the annotation down (used to find shifts). */
  strict: boolean;
  starts: (letter: string) => boolean;
}

const sig = (strict: boolean, starts: (letter: string) => boolean): Signature => ({
  strict,
  starts,
});
const oneOf = (letters: string) => (c: string) => letters.includes(c);
const isArabicLetter = (c: string) => /[ء-يٱ]/.test(c);

export const SIGNATURES: Readonly<Record<PackRuleId, Signature>> = {
  hamzat_wasl: sig(true, (c) => c === 'ٱ'),
  lam_shamsiyyah: sig(true, (c) => c === 'ل'),
  ghunnah: sig(true, oneOf('نم')),
  qalqalah: sig(true, oneOf('قطبجد')),
  ikhfa: sig(true, (c) => NUN_OR_TANWIN.has(c)),
  idghaam_ghunnah: sig(true, (c) => NUN_OR_TANWIN.has(c)),
  idghaam_no_ghunnah: sig(true, (c) => NUN_OR_TANWIN.has(c)),
  iqlab: sig(true, (c) => NUN_OR_TANWIN.has(c)),
  ikhfa_shafawi: sig(true, (c) => c === 'م'),
  idghaam_shafawi: sig(false, oneOf('مب')),
  madd_2: sig(false, (c) => MADD.has(c)),
  madd_246: sig(false, (c) => MADD.has(c) || isArabicLetter(c)),
  madd_muttasil: sig(false, (c) => MADD.has(c)),
  madd_munfasil: sig(false, (c) => MADD.has(c)),
  madd_6: sig(false, (c) => MADD.has(c)),
  silent: sig(false, (c) => MADD.has(c)),
  idghaam_mutajanisayn: sig(false, isArabicLetter),
  idghaam_mutaqaribayn: sig(false, isArabicLetter),
};

/** The largest drift tried, in code points either way. */
const MAX_SHIFT = 4;

const fits = (text: readonly string[], a: Annotation, shift: number): boolean => {
  const start = a.start + shift;
  const end = a.end + shift;
  return start >= 0 && end <= text.length && SIGNATURES[a.rule].starts(text[start]!);
};

/** Shifts to try, nearest to `near` first. */
const around = (near: number): number[] => {
  const out = [near];
  for (let d = 1; d <= 2 * MAX_SHIFT; d++) out.push(near + d, near - d);
  return out.filter((s) => Math.abs(s) <= MAX_SHIFT);
};

export interface Alignment {
  annotations: Annotation[];
  /** How many annotations had to be moved. */
  moved: number;
}

/**
 * The annotations moved onto `text` (code points), or `null` when they cannot all be placed.
 * Strict annotations find their shift near the previous one; the others take the shift of the
 * nearest strict annotation before them (after them, at the start of an āya).
 */
export function align(
  text: readonly string[],
  annotations: readonly Annotation[]
): Alignment | null {
  const shifts: (number | null)[] = annotations.map(() => null);
  let last = 0;
  annotations.forEach((a, i) => {
    if (!SIGNATURES[a.rule].strict) return;
    const found = around(last).find((s) => fits(text, a, s));
    if (found === undefined) return;
    shifts[i] = found;
    last = found;
  });
  if (annotations.some((a, i) => SIGNATURES[a.rule].strict && shifts[i] === null))
    return null;

  const strictShifts = shifts.map((s, i) => ({ s, i })).filter((x) => x.s !== null);
  annotations.forEach((a, i) => {
    if (shifts[i] !== null) return;
    const before = [...strictShifts].reverse().find((x) => x.i < i);
    const after = strictShifts.find((x) => x.i > i);
    // The shift of the strict neighbours first; then the nearest that fits, moving on from the
    // one before (the drift only grows where Tanzil added a character).
    const carried = before?.s ?? after?.s ?? 0;
    const candidates = [before?.s ?? null, after?.s ?? null, ...around(carried)].filter(
      (s): s is number => s !== null
    );
    const found = candidates.find((s) => fits(text, a, s));
    if (found !== undefined) shifts[i] = found;
  });
  if (shifts.some((s) => s === null)) return null;

  return {
    annotations: annotations.map((a, i) => ({
      ...a,
      start: a.start + shifts[i]!,
      end: a.end + shifts[i]!,
    })),
    moved: shifts.filter((s) => s !== 0).length,
  };
}
