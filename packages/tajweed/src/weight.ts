import {
  ALIF_WASLA,
  type Grapheme,
  graphemes,
  hasShadda,
  isArabicLetter,
  letterOf,
} from './letters';
import type { Occurrence } from './detect';
import { RULES, type WeightRule } from './rules';

const FATHA = new Set(['َ', 'ً', 'ࣰ']);
const DAMMA = new Set(['ُ', 'ٌ', 'ࣱ']);
const KASRA = new Set(['ِ', 'ٍ', 'ࣲ']);
const TANWIN = new Set(['ً', 'ٌ', 'ٍ', 'ࣰ', 'ࣱ', 'ࣲ']);
/** The small zeros over a letter that is written but not read (قَالُوا۟). */
const SILENT_SIGNS = new Set(['۟', '۠']);

/** The short vowel a letter carries, a tanwīn counting as its vowel. */
type Vowel = 'fatha' | 'damma' | 'kasra';

/**
 * Why a rāʾ or the lām of Allāh is heavy or light, for the card and the game's feedback: its own
 * vowel, or the vowel before it, the hamzat al-waṣl before a rāʾ sākina, or a heavy letter
 * after it; `start` for the lām of Allāh at the start of reading.
 */
export type WeightReason =
  | Vowel
  | 'after-fatha'
  | 'after-damma'
  | 'after-kasra'
  | 'after-wasla'
  | 'before-heavy'
  | 'start';

function vowelOf(g: Grapheme): Vowel | undefined {
  for (const mark of g.marks) {
    if (FATHA.has(mark)) return 'fatha';
    if (DAMMA.has(mark)) return 'damma';
    if (KASRA.has(mark)) return 'kasra';
  }
  return undefined;
}

const isSilent = (g: Grapheme): boolean => [...g.marks].some((m) => SILENT_SIGNS.has(m));
const hasTanwin = (g: Grapheme): boolean => [...g.marks].some((m) => TANWIN.has(m));
const isHeavyLetter = (g: Grapheme): boolean => {
  const letter = letterOf(g.char);
  return letter !== undefined && RULES.tafkhim.letters.includes(letter);
};

const occurrence = (
  rule: WeightRule,
  g: Grapheme,
  reason: WeightReason,
  decider?: Grapheme
): Occurrence => ({
  rule,
  start: g.start,
  carrierEnd: g.end,
  end: decider && decider.start >= g.end ? decider.end : g.end,
  reason,
  ...(decider && decider.start >= g.end ? { follower: letterOf(decider.char) } : {}),
});

/**
 * The vowel heard before the grapheme at `i`, across words as they are joined in reading:
 * letters without a vowel of their own (alif waṣla, the lām of "al", madd letters, silent
 * letters) are passed over; a tanwīn before alif waṣla is read with kasra (أَحَدٌ ٱللَّهُ), as
 * is a sukūn the muṣḥaf leaves without its helping vowel. `undefined` at the start of reading.
 */
function vowelBefore(gs: readonly Grapheme[], i: number): Vowel | undefined {
  for (let j = i - 1; j >= 0; j--) {
    const g = gs[j] as Grapheme;
    if (!isArabicLetter(g.char)) return undefined;
    if (isSilent(g)) continue;
    const crossesWord = gs.slice(j + 1, i + 1).some((h) => h.wordStart);
    if (hasTanwin(g) && crossesWord) return 'kasra';
    const vowel = vowelOf(g);
    if (vowel) return vowel;
    if (crossesWord && /[ْۡ]/u.test(g.marks)) return 'kasra';
  }
  return undefined;
}

/** The letters of a word, its alifs alike and its marks left out. */
const skeleton = (word: readonly Grapheme[]): string =>
  word
    .map((g) => g.char)
    .join('')
    .replace(/[ٱأإآ]/g, 'ا');

/**
 * The lām of the name Allāh (lafẓ al-jalāla), with or without a prefix: ٱللَّهُ, وَٱللَّهِ,
 * بِٱللَّهِ, تَٱللَّهِ, لِلَّهِ, فَلِلَّهِ, ٱللَّهُمَّ, ءَآللَّهُ. The doubled lām is the one read.
 */
const JALALA = /^(?:[وفبت]|ء|وب|اب)?(?:ال|ل)لهم?$/u;

/** The words of the text: graphemes from one word start to the next. */
function words(gs: readonly Grapheme[]): Grapheme[][] {
  const result: Grapheme[][] = [];
  for (const g of gs) {
    if (g.wordStart || result.length === 0) result.push([]);
    (result[result.length - 1] as Grapheme[]).push(g);
  }
  return result;
}

/** The lām of Allāh: heavy after fatḥa or ḍamma and at the start, light after kasra. */
function lamOfAllah(gs: readonly Grapheme[]): Occurrence[] {
  const found: Occurrence[] = [];
  for (const word of words(gs)) {
    if (!JALALA.test(skeleton(word))) continue;
    // The lām just before the hāʾ: in لِّلَّهِ the first lām has a shadda of its own (idghām).
    const lam = word[word.findIndex((g) => g.char === 'ه') - 1];
    if (!lam || lam.char !== 'ل' || !hasShadda(lam)) continue;
    const vowel = vowelBefore(gs, gs.indexOf(lam));
    if (vowel === 'kasra') found.push(occurrence('lam-light', lam, 'after-kasra'));
    else found.push(occurrence('lam-heavy', lam, vowel ? `after-${vowel}` : 'start'));
  }
  return found;
}

/**
 * Rāʾ: heavy with fatḥa or ḍamma, light with kasra. A rāʾ sākina takes the vowel before it in
 * its word: light after an original kasra unless a heavy letter follows in the word (قِرْطَاسٍ,
 * مِرْصَادًا), heavy after fatḥa or ḍamma and after hamzat al-waṣl (ٱرْجِعِىٓ), whose kasra
 * is not its own. A rāʾ merged into the next one (وَٱذْكُر رَّبَّكَ) is read only once.
 */
function rasOf(gs: readonly Grapheme[]): Occurrence[] {
  const found: Occurrence[] = [];
  for (let i = 0; i < gs.length; i++) {
    const g = gs[i] as Grapheme;
    if (g.char !== 'ر' || isSilent(g)) continue;
    const own = vowelOf(g);
    if (own) {
      found.push(occurrence(own === 'kasra' ? 'ra-light' : 'ra-heavy', g, own));
      continue;
    }
    const next = gs[i + 1];
    if (g.marks === '' && next?.char === 'ر' && hasShadda(next)) continue;
    found.push(sakinRa(gs, i));
  }
  return found;
}

/** A rāʾ sākina, decided by what is before it in its word and the letter after it. */
function sakinRa(gs: readonly Grapheme[], i: number): Occurrence {
  const g = gs[i] as Grapheme;
  for (let j = i - 1; j >= 0; j--) {
    const before = gs[j] as Grapheme;
    // Alif waṣla (وَٱرْكَعُوا۟), or the bare alif that spells it at the start of a word
    // without ٱ (ارْجِعِي).
    const bareAlif = before.wordStart && before.char === 'ا' && before.marks === '';
    if (before.char === ALIF_WASLA || bareAlif) {
      return occurrence('ra-heavy', g, 'after-wasla');
    }
    const vowel = vowelOf(before);
    if (vowel === 'kasra') {
      const after = gs[i + 1];
      if (
        after &&
        !after.wordStart &&
        isHeavyLetter(after) &&
        vowelOf(after) !== 'kasra'
      ) {
        return occurrence('ra-heavy', g, 'before-heavy', after);
      }
      return occurrence('ra-light', g, 'after-kasra');
    }
    if (vowel) return occurrence('ra-heavy', g, `after-${vowel}`);
    // A yāʾ sākina before it makes it light too (خَبِيرْ, at a stop).
    if (letterOf(before.char) === 'ي' && !isSilent(before)) {
      return occurrence('ra-light', g, 'after-kasra');
    }
    if (before.wordStart) break;
  }
  return occurrence('ra-heavy', g, 'after-fatha');
}

/** The seven heavy letters (istiʿlāʾ, خُصَّ ضَغْطٍ قِظْ): always heavy. */
function heavyLetters(gs: readonly Grapheme[]): Occurrence[] {
  return gs
    .filter((g) => isHeavyLetter(g) && !isSilent(g))
    .map((g): Occurrence => ({
      rule: 'tafkhim',
      start: g.start,
      carrierEnd: g.end,
      end: g.end,
    }));
}

/**
 * The heavy and light letters of unit 6 (spec 03 §4c): the seven letters of istiʿlāʾ, the lām
 * of Allāh and every rāʾ, each heavy (tafkhīm) or light (tarqīq), as read joined (waṣl). The
 * rāʾ at a stop and the letters of middle weight are left to waqf (unit 7) and the cards.
 */
export function weightOccurrences(gs: readonly Grapheme[]): Occurrence[] {
  return [...heavyLetters(gs), ...lamOfAllah(gs), ...rasOf(gs)];
}

/** The same for a text: for tests and tools. */
export const weightsOf = (text: string): Occurrence[] =>
  weightOccurrences(graphemes(text));
