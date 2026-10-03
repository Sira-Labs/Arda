/**
 * The Arabic letters and marks the engine reads. Input is vocalised Qurʾān text (IndoPak or
 * ʿUthmānī, ADR-0007); unvocalised text is not supported, because a bare nūn could be anything.
 */

/** The 28 letters of the alphabet, hamza standing for alif (spec 03 §3). */
export const LETTERS = [
  'ء',
  'ب',
  'ت',
  'ث',
  'ج',
  'ح',
  'خ',
  'د',
  'ذ',
  'ر',
  'ز',
  'س',
  'ش',
  'ص',
  'ض',
  'ط',
  'ظ',
  'ع',
  'غ',
  'ف',
  'ق',
  'ك',
  'ل',
  'م',
  'ن',
  'ه',
  'و',
  'ي',
] as const;
export type Letter = (typeof LETTERS)[number];

const LETTER_SET: ReadonlySet<string> = new Set(LETTERS);

/** Written forms that read as one of the 28 letters. */
const LETTER_FORMS: Readonly<Record<string, Letter>> = {
  // Hamza on a seat, and alif with madda: they are read as a hamza.
  أ: 'ء',
  إ: 'ء',
  ؤ: 'ء',
  ئ: 'ء',
  آ: 'ء',
  ة: 'ت',
  ى: 'ي',
  ک: 'ك',
  ی: 'ي',
  ہ: 'ه',
  ھ: 'ه',
};

/**
 * The letter a written character reads as, or `undefined` for marks, other characters and the
 * alifs (a bare alif is a long vowel or a seat; which one depends on its place, see `detect`).
 */
export function letterOf(char: string): Letter | undefined {
  if (LETTER_SET.has(char)) return char as Letter;
  return LETTER_FORMS[char];
}

/** Any Arabic letter, including the alifs and the letters `letterOf` does not map. */
export function isArabicLetter(char: string): boolean {
  return /\p{L}/u.test(char) && /\p{Script=Arabic}/u.test(char) && !isMark(char);
}

/** Alif waṣla (ٱ): a vowel is carried over it, so a preceding nūn or mīm is not sākin. */
export const ALIF_WASLA = 'ٱ';

export const SUKUN = new Set(['ْ', 'ۡ']);
export const SHADDA = 'ّ';
export const SHORT_VOWELS = new Set(['َ', 'ُ', 'ِ']);
/** Fatḥatān, ḍammatān, kasratān, and their open ʿUthmānī forms. */
export const TANWIN = new Set(['ً', 'ٌ', 'ٍ', 'ࣰ', 'ࣱ', 'ࣲ']);
/** Small high mīm (ۢ) and small low mīm (ۭ): the muṣḥaf's iqlāb sign. */
export const IQLAB_SIGN = new Set(['ۢ', 'ۭ']);
const TATWEEL = 'ـ';

/** A mark written on a letter: vowels, sukūn, shadda, Qurʾānic signs, stop signs, tatweel. */
export function isMark(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0x064b && code <= 0x065f) ||
    code === 0x0670 ||
    (code >= 0x06d6 && code <= 0x06ed && code !== 0x06dd && code !== 0x06de) ||
    (code >= 0x08d3 && code <= 0x08ff) ||
    char === TATWEEL
  );
}

/** One written letter with the marks on it, at its code-unit offset in the source text. */
export interface Grapheme {
  char: string;
  marks: string;
  /** Offset of `char` in the text. */
  start: number;
  /** Offset just after the last mark. */
  end: number;
  /** Whether whitespace separates it from the previous grapheme (a new word starts). */
  wordStart: boolean;
}

/**
 * Splits text into letters with their marks. Whitespace becomes a word boundary; anything that
 * is neither a letter, a mark nor whitespace (an āya number, ۝, ۞) also ends the word, and is
 * kept as a grapheme so a rule never reaches across it.
 */
export function graphemes(text: string): Grapheme[] {
  const result: Grapheme[] = [];
  let wordStart = true;
  for (let i = 0; i < text.length; i++) {
    const char = text[i] as string;
    if (/\s/u.test(char)) {
      wordStart = true;
      continue;
    }
    const previous = result[result.length - 1];
    if (isMark(char) && previous && !wordStart) {
      previous.marks += char;
      previous.end = i + 1;
      continue;
    }
    result.push({ char, marks: '', start: i, end: i + 1, wordStart });
    wordStart = !isArabicLetter(char);
  }
  return result;
}

const hasAny = (marks: string, set: ReadonlySet<string>): boolean =>
  [...marks].some((mark) => set.has(mark));

export const hasSukun = (g: Grapheme): boolean => hasAny(g.marks, SUKUN);
export const hasTanwin = (g: Grapheme): boolean => hasAny(g.marks, TANWIN);
export const hasShadda = (g: Grapheme): boolean => g.marks.includes(SHADDA);
export const hasIqlabSign = (g: Grapheme): boolean => hasAny(g.marks, IQLAB_SIGN);
export const hasVowel = (g: Grapheme): boolean =>
  hasAny(g.marks, SHORT_VOWELS) || hasTanwin(g) || g.marks.includes('ٰ');
