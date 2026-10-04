import type { PackRuleId } from '@arda/tajweed';
import type { Annotation } from './cpfair';

/**
 * Re-aligning cpfair's annotations to the current Tanzil text.
 *
 * cpfair indexed Tanzil's text of April 2017. That file is not available any more, and cpfair's
 * classifier carries no licence, so the annotations are moved, not recomputed. Tanzil 1.1
 * differs from the 2017 text in three ways that explain all but 21 of the 6236 āyāt:
 *
 * 1. pause signs are written as " ۖ" (a space and the sign); in 2017 they were not there;
 * 2. a hamza after a lām is written on a tatweel, "ـَٔ"; in 2017 it was "ءَ" (ٱلْـَٔاخِرَة);
 * 3. the small yāʾ on a tatweel, "ـۧ" (إِبْرَٰهِـۧم), was the small yāʾ "ۦ" alone.
 *
 * `toTanzil2017` rebuilds the 2017 text with a map back to the current one, and the offsets are
 * carried over exactly. Each rule also has a signature (the letter it starts on, read off the
 * āyāt that line up); where the mapped annotations still do not fit (ٱلْءَٰنَ and a few
 * others), the smallest checked shift is tried. An āya that does not fit then fails the import:
 * nothing is guessed silently.
 */

const PAUSE = /[\u06D6-\u06DC]/;
const VOWEL = /[\u064B-\u0652]/;

/**
 * The 2017 text of an āya, from the current one (see above), and for each of its code points
 * the index of the same code point in the current text (plus the length, for spans ending at
 * the end).
 */
export function toTanzil2017(text: readonly string[]): { old: string[]; map: number[] } {
  const old: string[] = [];
  const map: number[] = [];
  const keep = (c: string, at: number) => {
    old.push(c);
    map.push(at);
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === ' ' && PAUSE.test(text[i + 1] ?? '')) {
      i++;
      continue;
    }
    if (c === '\u0640') {
      let j = i + 1;
      while (j < text.length && VOWEL.test(text[j]!)) j++;
      if (text[j] === '\u0654' && text[i - 2] === '\u0644') {
        // ـَٔ after a lām → ءَ: the hamza stands where the tatweel was.
        keep('\u0621', i);
        for (let k = i + 1; k < j; k++) keep(text[k]!, k);
        i = j;
        continue;
      }
      if (text[i + 1] === '\u06E7') {
        keep('\u06E6', i + 1);
        i++;
        continue;
      }
    }
    keep(c, i);
  }
  map.push(text.length);
  return { old, map };
}

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
  // Also on the letters of the muqaṭṭaʿāt: the lām of الٓمٓ.
  madd_6: sig(false, (c) => MADD.has(c) || isArabicLetter(c)),
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

/**
 * cpfair's annotations of an āya carried over to the current Tanzil `text`: mapped exactly
 * through the 2017 text, then, where that still does not fit, by the smallest checked shift.
 * `null` when they cannot all be placed.
 */
export function realign(
  text: readonly string[],
  annotations: readonly Annotation[]
): Alignment | null {
  const { map } = toTanzil2017(text);
  const mapped = annotations.map((a) =>
    a.end <= map.length - 1
      ? { ...a, start: map[a.start]!, end: map[a.end - 1]! + 1 }
      : { ...a }
  );
  const fitted = align(text, mapped);
  if (!fitted) return null;
  const moved = annotations.filter(
    (a, i) =>
      a.start !== fitted.annotations[i]!.start || a.end !== fitted.annotations[i]!.end
  ).length;
  return { annotations: fitted.annotations, moved };
}
