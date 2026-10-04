import type { PackSpan } from '@arda/quran';

/**
 * Carrying a word's rule spans from the ʿUthmānī spelling (Tanzil, which cpfair annotates) to
 * the IndoPak spelling of the same word (ADR-0008, S2.2). The two spell many words
 * differently (a full alif for a small one, آ for ءا, ي for ى, no waṣla sign), so letters are
 * matched, not offsets: each word becomes a list of letters (a base character with its marks;
 * the small alif U+0670 counts as a letter of its own, as the IndoPak spelling often writes it
 * in full), the two lists are aligned by edit distance on a normalised key, and a span moves to
 * the letters its first and last letter are aligned with.
 */

interface Letter {
  /** Normalised letter, for matching. */
  key: string;
  /** UTF-16 offsets in the word, marks included. */
  start: number;
  end: number;
}

const DAGGER_ALIF = '\u0670';
const HAMZA_ABOVE = '\u0654';
const TATWEEL = '\u0640';
/** Marks that stand for a letter of their own: small alif, IndoPak standing kasra and ḍamma. */
const LETTER_MARKS: Record<string, string> = {
  [DAGGER_ALIF]: 'ا',
  '\u0656': 'ي',
  '\u0657': 'و',
};
/** Combining marks and the invisible controls the IndoPak text carries (U+034F, U+202E). */
const isMark = (c: string) =>
  /[\p{Mn}\u034F\u202E\u08E2]/u.test(c) && !(c in LETTER_MARKS);

const KEYS: Record<string, string> = {
  ٱ: 'ا',
  أ: 'ا',
  إ: 'ا',
  آ: 'ا',
  ى: 'ي',
  ی: 'ي',
  ئ: 'ي',
  ؤ: 'و',
  ۥ: 'و',
  ۦ: 'ي',
  ...LETTER_MARKS,
};

export function lettersOf(word: string): Letter[] {
  const letters: Letter[] = [];
  for (let i = 0; i < word.length; i++) {
    const c = word[i]!;
    const last = letters.at(-1);
    if (isMark(c) && last) {
      last.end = i + 1;
      // A hamza on a tatweel is the letter hamza.
      if (c === HAMZA_ABOVE && last.key === '') last.key = 'ء';
      continue;
    }
    letters.push({ key: c === TATWEEL ? '' : (KEYS[c] ?? c), start: i, end: i + 1 });
  }
  return letters;
}

/**
 * For each letter of `a`, the letter of `b` it is aligned with (or -1): edit distance with
 * adjacent transpositions (optimal string alignment).
 */
export function alignLetters(a: readonly Letter[], b: readonly Letter[]): number[] {
  const n = a.length;
  const m = b.length;
  const diff = (i: number, j: number) => (a[i]!.key === b[j]!.key ? 0 : 1);
  const swapped = (i: number, j: number) =>
    i > 0 && j > 0 && a[i]!.key === b[j - 1]!.key && a[i - 1]!.key === b[j]!.key;
  const cost: number[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      let best = Math.min(
        cost[i - 1]![j - 1]! + diff(i - 1, j - 1),
        cost[i - 1]![j]! + 1,
        cost[i]![j - 1]! + 1
      );
      if (swapped(i - 1, j - 1)) best = Math.min(best, cost[i - 2]![j - 2]! + 1);
      cost[i]![j] = best;
    }
  }
  const to = new Array<number>(n).fill(-1);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (swapped(i - 1, j - 1) && cost[i]![j] === cost[i - 2]![j - 2]! + 1) {
      to[i - 1] = j - 2;
      to[i - 2] = j - 1;
      i -= 2;
      j -= 2;
    } else if (cost[i]![j] === cost[i - 1]![j - 1]! + diff(i - 1, j - 1)) {
      to[i - 1] = j - 1;
      i--;
      j--;
    } else if (cost[i]![j] === cost[i - 1]![j]! + 1) {
      i--;
    } else {
      j--;
    }
  }
  return to;
}

export interface Carried<R extends string> {
  spans: PackSpan<R>[];
  /** Spans whose first letter has no counterpart, or a different one. */
  misses: { span: PackSpan<R>; from: string; to: string }[];
}

/** The rule spans of `source` moved onto `target`, the same word in another spelling. */
export function carrySpans<R extends string>(
  source: string,
  target: string,
  spans: readonly PackSpan<R>[]
): Carried<R> {
  const from = lettersOf(source);
  const to = lettersOf(target);
  const aligned = alignLetters(from, to);
  const letterAt = (offset: number) =>
    from.findIndex((l) => offset >= l.start && offset < l.end);
  const carried: PackSpan<R>[] = [];
  const misses: Carried<R>['misses'] = [];

  for (const span of spans) {
    const [start, end, rule, role] = span;
    const first = letterAt(start);
    const last = letterAt(end - 1);
    // The letters the span's letters are aligned with; one the other spelling leaves out
    // (an alif) has none and is skipped.
    const targets: number[] = [];
    for (let k = first; k <= last; k++)
      if ((aligned[k] ?? -1) >= 0) targets.push(aligned[k]!);
    const a = aligned[first] ?? -1;
    if (a < 0 || from[first]!.key !== to[a]!.key) {
      misses.push({
        span,
        from: source.slice(from[first]?.start ?? start, from[first]?.end ?? end),
        to: a < 0 ? '' : target.slice(to[a]!.start, to[a]!.end),
      });
      continue;
    }
    const lo = Math.min(...targets);
    const hi = Math.max(...targets);
    // A span over marks only (a ghunna on a shadda, a madd on a small alif) keeps to the same
    // marks when the IndoPak letter has them; otherwise it covers the whole letter.
    const marksOnly = start > from[first]!.start && first === last;
    let s = to[lo]!.start;
    let e = to[hi]!.end;
    if (marksOnly) {
      const marks = source.slice(start, end);
      const at = target.indexOf(marks, s);
      if (at >= 0 && at + marks.length <= e) {
        s = at;
        e = at + marks.length;
      }
    }
    carried.push(role ? [s, e, rule, role] : [s, e, rule]);
  }
  return { spans: carried, misses };
}
