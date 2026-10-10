import {
  ALIF_WASLA,
  type Grapheme,
  type Letter,
  hasShadda,
  hasSukun,
  hasVowel,
  isArabicLetter,
  letterOf,
} from './letters';
import type { MaddRule } from './rules';
import type { Occurrence } from './detect';

const FATHA = 'َ';
const DAMMA = 'ُ';
const KASRA = 'ِ';
/** The madda sign: the muṣḥaf's mark of a madd longer than two counts. */
const MADDA = 'ٓ';
/** IndoPak's sign of the obligatory madd, written where ʿUthmānī text has the madda. */
const MADDA_WAJIB = '\u089c';
/**
 * Signs that write a long vowel on a letter: the small alif (ʿUthmānī and IndoPak "standing
 * fatḥa"), IndoPak's standing kasra and inverted ḍamma, the small wāw and yāʾ of the ṣila after
 * a hāʾ (بِهِۦ, لَهُۥ), and the small yāʾ on a tatweel (إِبْرَٰهِـۧمَ).
 */
const LONG_VOWEL_SIGNS = new Set(['ٰ', 'ٖ', 'ٗ', 'ۥ', 'ۦ', 'ۧ']);
/**
 * The tatweel: `graphemes` keeps it with the marks of the letter before, but in the muṣḥaf it is
 * a seat of its own, for a hamza (خَطِيٓـَٔتُهُۥ) or a small yāʾ (إِبْرَٰهِـۧمَ).
 */
const TATWEEL = 'ـ';
/** The small zeros over a letter that is written but not read (قَالُوا۟, أُو۟لَٰٓئِكَ). */
const SILENT_SIGNS = new Set(['۟', '۠']);
/** Hamza written as a mark on an alif. */
const HAMZA_SIGNS = new Set(['ٔ', 'ٕ']);
/** Marks a madd letter may carry: none, or a sukūn, or the madda (and a small alif on ى). */
const MADD_LETTER_MARKS = new Set(['ْ', 'ۡ', MADDA, MADDA_WAJIB, 'ٰ']);

/** The marks on the letter itself, before a tatweel seat. */
const ownMarks = (g: Grapheme): string => g.marks.split(TATWEEL)[0] as string;
/** The marks on a tatweel after the letter, or '' when there is none. */
const seatMarks = (g: Grapheme): string => g.marks.split(TATWEEL).slice(1).join('');

const isSilent = (g: Grapheme): boolean => [...g.marks].some((m) => SILENT_SIGNS.has(m));
const onlyMaddMarks = (g: Grapheme): boolean =>
  [...ownMarks(g)].every((m) => MADD_LETTER_MARKS.has(m));
const hasMark = (g: Grapheme, mark: string): boolean => ownMarks(g).includes(mark);
const hasMadda = (g: Grapheme): boolean =>
  g.char === 'آ' || hasMark(g, MADDA) || hasMark(g, MADDA_WAJIB);
/** A bare alif without vowel or hamza: alif waṣla where the spelling has no ٱ (فَاتَّقُوا). */
const isBareAlif = (g: Grapheme): boolean => g.char === 'ا' && g.marks === '';
/**
 * Whether a hamza sits on a tatweel after the letter and is read after its madd: يَٰٓـَٔادَمُ,
 * خَطِيٓـَٔتُهُۥ. A seat that also carries the small alif is the hamza with its own long vowel
 * (ٱلْـَٰٔنَ).
 */
const hasHamzaSeat = (g: Grapheme): boolean =>
  [...seatMarks(g)].some((m) => HAMZA_SIGNS.has(m)) && !seatMarks(g).includes('ٰ');

/** Whether the grapheme is read as a hamza: a hamza letter, or an alif carrying a vowel or a hamza. */
function isHamza(g: Grapheme): boolean {
  // آ inside a word is the madd alif, at the start of a word a hamza (آمَنَ).
  if (g.char === 'آ') return g.wordStart;
  if (letterOf(g.char) === 'ء') return true;
  if (g.char !== 'ا') return false;
  return (
    [...g.marks].some((m) => HAMZA_SIGNS.has(m)) ||
    hasMark(g, FATHA) ||
    hasMark(g, DAMMA) ||
    hasMark(g, KASRA)
  );
}

/**
 * Whether the grapheme at `i` is a madd letter: alif (or alif maqṣūra) after fatḥa, wāw after
 * ḍamma, yāʾ after kasra, each without a vowel of its own; or a letter carrying a long-vowel
 * sign.
 */
function isMaddLetter(gs: readonly Grapheme[], i: number): boolean {
  const g = gs[i] as Grapheme;
  if (isSilent(g)) return false;
  if ([...g.marks].some((m) => LONG_VOWEL_SIGNS.has(m) && m !== 'ٰ')) return true;
  // The small alif on a letter (ٱلرَّحْمَٰنِ, هَٰذَا); on alif maqṣūra it only shows the alif.
  if (hasMark(g, 'ٰ') && g.char !== 'ى') return true;
  if (seatMarks(g).includes('ٰ')) return true;
  const previous = previousRead(gs, i);
  if (g.wordStart || !previous || !onlyMaddMarks(g)) return false;
  switch (g.char) {
    // Also the alif with madda written as one character (U+0622) inside a word: السَّمَآءِ.
    case 'ا':
    case 'آ':
      return hasMark(previous, FATHA);
    // ʿUthmānī text writes a final yāʾ without dots (فِى), so ى is an alif after fatḥa and a
    // yāʾ after kasra. A yāʾ or wāw with sukūn after fatḥa is līn, not madd (شَىْءٍ, خَوْفٌ).
    case 'ى':
      return hasMark(previous, KASRA) || (hasMark(previous, FATHA) && !hasSukun(g));
    case 'و':
      return hasMark(previous, DAMMA);
    case 'ي':
    case 'ی':
      return hasMark(previous, KASRA);
    default:
      return false;
  }
}

/** The grapheme read before `i` in the same word, skipping silent letters (وَجِا۟ىٓءَ). */
function previousRead(gs: readonly Grapheme[], i: number): Grapheme | undefined {
  for (let j = i - 1; j >= 0; j--) {
    const g = gs[j] as Grapheme;
    if (!isSilent(g)) return g;
    if (g.wordStart) return undefined;
  }
  return undefined;
}

interface Read {
  grapheme: Grapheme;
  /** Whether a word starts between the madd letter and it. */
  acrossWords: boolean;
}

/** The next grapheme that is read, skipping silent letters and the plural alif after a wāw. */
function nextRead(gs: readonly Grapheme[], i: number): Read | undefined {
  // A skipped letter may be the one that starts the next word.
  let acrossWords = false;
  for (let j = i + 1; j < gs.length; j++) {
    const g = gs[j] as Grapheme;
    if (!isArabicLetter(g.char)) return undefined;
    acrossWords ||= g.wordStart;
    if (isSilent(g)) continue;
    // قَالُوا in spelling without the small zero: the alif after a final wāw is not read.
    if (g.char === 'ا' && g.marks === '' && gs[j - 1]?.char === 'و') {
      const after = gs[j + 1];
      if (!after || after.wordStart || !isArabicLetter(after.char)) continue;
    }
    return { grapheme: g, acrossWords };
  }
  return undefined;
}

interface Decision {
  rule: MaddRule;
  /** The grapheme that decided a long madd: the hamza, or the letter with shadda or sukūn. */
  decider?: Grapheme;
  follower?: Letter;
}

/** Which madd the madd letter at `i` is, from what is read after it. */
function decide(gs: readonly Grapheme[], i: number): Decision | undefined {
  const g = gs[i] as Grapheme;
  // The vocative yā and the hā of attention are written joined to the next word but are words
  // of their own, so the madd before their hamza is separated (munfaṣil ḥukmī): يَٰٓأَيُّهَا,
  // هَٰٓؤُلَآءِ, يَٰٓـَٔادَمُ.
  const hamzaRule: MaddRule = g.wordStart ? 'madd-munfasil' : 'madd-muttasil';
  if (hasHamzaSeat(g)) return { rule: hamzaRule, decider: g, follower: 'ء' };
  const read = nextRead(gs, i);
  if (!read) return { rule: 'madd-tabii' };
  const { grapheme: next, acrossWords } = read;
  // Before alif waṣla the madd letter is not read long at all: فِى ٱلْأَرْضِ.
  if (next.char === ALIF_WASLA || (acrossWords && isBareAlif(next))) return undefined;
  if (isHamza(next)) {
    const rule = acrossWords ? 'madd-munfasil' : hamzaRule;
    return { rule, decider: next, follower: 'ء' };
  }
  if (!acrossWords && (hasShadda(next) || (hasSukun(next) && !hasVowel(next)))) {
    // The muṣḥaf writes the madda on every madd lāzim (ٱلضَّآلِّينَ); a bare alif before a
    // sākin letter is the alif waṣla of spellings without ٱ (وَالْأَرْضِ), and not read.
    if (hasMadda(g))
      return { rule: 'madd-lazim', decider: next, follower: letterOf(next.char) };
    if (isBareAlif(g)) return undefined;
  }
  return { rule: 'madd-tabii' };
}

/**
 * The madd rules in a text's graphemes (unit 5): natural (two counts), joined (a hamza after
 * the madd letter in the same word), separated (the madd letter ends a word and the next starts
 * with a hamza) and necessary (a shadda or sukūn after it in the same word). A madd letter
 * before alif waṣla is not lengthened at all (فِى ٱلْأَرْضِ). The madd at a stop (ʿāriḍ) and the
 * opening letters of sūras are left to waqf (unit 7) and the cards.
 */
export function maddOccurrences(gs: readonly Grapheme[]): Occurrence[] {
  const found: Occurrence[] = [];
  for (let i = 0; i < gs.length; i++) {
    if (!isMaddLetter(gs, i)) continue;
    const decision = decide(gs, i);
    if (!decision) continue;
    const g = gs[i] as Grapheme;
    const occurrence: Occurrence = {
      rule: decision.rule,
      start: g.start,
      carrierEnd: g.end,
      end: decision.decider?.end ?? g.end,
    };
    if (decision.follower) {
      occurrence.follower = decision.follower;
      occurrence.acrossWords = decision.rule === 'madd-munfasil';
    }
    found.push(occurrence);
  }
  return found;
}
