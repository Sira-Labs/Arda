import {
  ALIF_WASLA,
  type Grapheme,
  hasShadda,
  isArabicLetter,
  letterOf,
} from './letters';
import type { Occurrence } from './detect';
import { isMaddLetter } from './madd';
import { isQalqalaLetter, type WaqfRule } from './rules';
import type { WeightReason } from './weight';

const FATHA = new Set(['َ', 'ً', 'ࣰ']);
const DAMMA = new Set(['ُ', 'ٌ', 'ࣱ']);
const KASRA = new Set(['ِ', 'ٍ', 'ࣲ']);
const FATHATAN = new Set(['ً', 'ࣰ']);
const SUKUN = new Set(['ْ', 'ۡ']);
/** The small zeros over a letter that is written but not read (قَالُوا۟). */
const SILENT_SIGNS = new Set(['۟', '۠']);
/** The small wāw and yāʾ of the ṣila after a hāʾ (بِهِۦ, لَهُۥ): dropped at a stop. */
const SILA_SIGNS = new Set(['ۥ', 'ۦ']);

type Vowel = 'fatha' | 'damma' | 'kasra';

function vowelOf(g: Grapheme): Vowel | undefined {
  for (const mark of g.marks) {
    if (FATHA.has(mark)) return 'fatha';
    if (DAMMA.has(mark)) return 'damma';
    if (KASRA.has(mark)) return 'kasra';
  }
  return undefined;
}

const has = (g: Grapheme, set: ReadonlySet<string>): boolean =>
  [...g.marks].some((m) => set.has(m));
const isSilent = (g: Grapheme): boolean => has(g, SILENT_SIGNS);
const isBareAlif = (g: Grapheme | undefined): boolean =>
  g !== undefined && (g.char === 'ا' || g.char === 'ى') && g.marks === '';

const at = (rule: WaqfRule | 'qalqala', g: Grapheme, end = g.end): Occurrence => ({
  rule,
  start: g.start,
  carrierEnd: g.end,
  end,
});

/**
 * The indices of the last word's graphemes that are read: silent letters, the seat of
 * fatḥatān (عَلِيمًا, هُدًى) and the bare alif after a final wāw (قَالُوا) are written only.
 */
function lastWord(gs: readonly Grapheme[]): number[] {
  let end = gs.length - 1;
  while (end >= 0 && !isArabicLetter((gs[end] as Grapheme).char)) end--;
  let start = end;
  while (start > 0 && !(gs[start] as Grapheme).wordStart) start--;
  const read: number[] = [];
  for (let i = start; i <= end; i++) {
    const g = gs[i] as Grapheme;
    const before = gs[i - 1];
    if (isSilent(g)) continue;
    // The seat of fatḥatān, and the plural alif after a final wāw without a vowel of its own
    // (قَالُوا); the alif after a wāw with fatḥa is a madd letter (بِٱلْوَادِ).
    const seat = before !== undefined && has(before, FATHATAN);
    const plural = before?.char === 'و' && vowelOf(before) === undefined && i === end;
    if (i > start && isBareAlif(g) && (seat || plural)) continue;
    read.push(i);
  }
  return read;
}

/**
 * Rāʾ at a stop, sākin now: light after kasra or yāʾ sākina, also with one sākin letter between
 * (حِجْرٍ, ٱلذِّكْرِ); heavy after fatḥa or ḍamma (ٱلْقَدْرِ, غَفُورٌ). Words where both are
 * allowed (مِصْرَ, ٱلْقِطْرِ) are left to the sheikh.
 */
function raAtStop(
  gs: readonly Grapheme[],
  read: readonly number[]
): Occurrence | undefined {
  const last = gs[read[read.length - 1] as number] as Grapheme;
  for (let k = read.length - 2; k >= 0; k--) {
    const g = gs[read[k] as number] as Grapheme;
    const vowel = vowelOf(g);
    const reason: WeightReason | undefined =
      vowel === 'kasra'
        ? 'stop-after-kasra'
        : vowel
          ? `stop-after-${vowel}`
          : letterOf(g.char) === 'ي'
            ? 'stop-after-ya'
            : undefined;
    if (reason) {
      const light = reason === 'stop-after-kasra' || reason === 'stop-after-ya';
      return { ...at('waqf-sukun', last), rule: light ? 'ra-light' : 'ra-heavy', reason };
    }
  }
  return undefined;
}

/**
 * What a stop does to the last word of the text (spec 03 §4d), read as the reciter stops on it:
 * fatḥatān becomes a long ā (madd al-ʿiwaḍ), tāʾ marbūṭa a hāʾ sākina, any other last vowel a
 * sukūn; a madd letter before that sukūn is madd ʿāriḍ (2, 4 or 6 counts), a wāw or yāʾ sākina
 * after fatḥa madd līn. The last letter then bounces if it is a qalqala letter, and a rāʾ is
 * heavy or light by what is before it. A word ending in a long vowel stays as it is.
 */
export function stopOccurrences(gs: readonly Grapheme[]): Occurrence[] {
  const read = lastWord(gs);
  if (read.length === 0) return [];
  const lastIndex = read[read.length - 1] as number;
  const last = gs[lastIndex] as Grapheme;
  const seat = gs[lastIndex + 1];

  if (has(last, FATHATAN) && last.char !== 'ة') {
    const end = isBareAlif(seat) && !seat?.wordStart ? (seat as Grapheme).end : last.end;
    return [at('madd-iwad', last, end)];
  }
  if (last.char === 'ة') return [at('waqf-ha', last)];
  const sila = last.char === 'ه' && has(last, SILA_SIGNS);
  if (!sila && isMaddLetter(gs, lastIndex) && !vowelOf(last)) return [];

  const found: Occurrence[] = [];
  const ra = last.char === 'ر' ? raAtStop(gs, read) : undefined;
  found.push(ra ?? at('waqf-sukun', last));
  const letter = letterOf(last.char);
  if (letter && isQalqalaLetter(letter)) found.push(at('qalqala', last));

  const beforeIndex = read[read.length - 2];
  if (beforeIndex !== undefined) {
    const before = gs[beforeIndex] as Grapheme;
    const twoBefore = read[read.length - 3];
    const lin =
      (before.char === 'و' || before.char === 'ي' || before.char === 'ى') &&
      (has(before, SUKUN) || before.marks === '') &&
      twoBefore !== undefined &&
      vowelOf(gs[twoBefore] as Grapheme) === 'fatha';
    // A madd before a final hamza stays joined (muttaṣil) at a stop: ٱلسَّمَآءِ.
    const hamza = letterOf(last.char) === 'ء';
    if (isMaddLetter(gs, beforeIndex) && !lin && !hamza)
      found.push(at('madd-arid', before));
    else if (lin) found.push(at('madd-lin', before));
  }
  return found;
}

/**
 * Words begun with kasra although the third letter has ḍamma: the nouns with alif waṣla
 * (ٱسْمُهُۥ, ٱبْنُ, ٱمْرُؤٌ) and the verbs whose ḍamma there is not their own (ٱمْشُوا۟, ٱقْضُوٓا۟,
 * ٱئْتُوا۟, ٱمْضُوا۟). Skeletons without the alif.
 */
const KASRA_ANYWAY = /^(?:سم|بن|مرء|مرؤ|ثن|مشوا|قضوا|ئتوا|مضوا)/u;

/**
 * Beginning on alif waṣla (ibtidāʾ) at the start of the text: fatḥa in the article (ٱلْحَمْدُ),
 * ḍamma where the third letter has an original ḍamma (ٱنظُرْ, ٱدْعُ), kasra otherwise (ٱرْجِعِىٓ,
 * ٱسْمُهُۥ, ٱبْنَ).
 */
export function startOccurrence(gs: readonly Grapheme[]): Occurrence | undefined {
  const first = gs[0];
  if (!first || !first.wordStart) return undefined;
  const wasla = first.char === ALIF_WASLA || (first.char === 'ا' && first.marks === '');
  const second = gs[1];
  const third = gs[2];
  if (!wasla || !second || second.wordStart) return undefined;
  // The article: its lām sākin (ٱلْحَمْدُ, its vowel on a seat after it as in ٱلْـَٔاخِرَةِ), or
  // merged into the lām after it (ٱلَّذِى, ٱلَّيْلَ).
  const ownMarks = second.marks.split('ـ')[0] as string;
  const article =
    second.char === 'ل' && (hasShadda(second) || !/[\u064b-\u0650]/u.test(ownMarks));
  if (article) return at('ibtida-fatha', first, second.end);
  let end = 1;
  while (gs[end + 1] && !(gs[end + 1] as Grapheme).wordStart) end++;
  const skeleton = gs
    .slice(1, end + 1)
    .map((g) => g.char)
    .join('');
  // The third letter of the word as spoken: with a shadda the second letter is doubled and is
  // the third itself (ٱتَّقُوا۟ is begun with kasra, ٱتُّبِعُوا۟ with ḍamma).
  const decider = hasShadda(second) ? second : third;
  if (
    decider &&
    !decider.wordStart &&
    vowelOf(decider) === 'damma' &&
    !KASRA_ANYWAY.test(skeleton)
  ) {
    return at('ibtida-damma', first, decider.end);
  }
  return at('ibtida-kasra', first, first.end);
}
