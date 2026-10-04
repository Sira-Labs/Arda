/**
 * Splitting an āya of Tanzil text into words (ADR-0007, spec 03 §2). Words are separated by
 * spaces; a token made only of pause or sajdah signs is not a word but a mark after the word
 * before it. The text of every word stays exactly as Tanzil has it.
 */

/** Pause signs (U+06D6–U+06DC) and the sajdah sign (U+06E9). */
const MARK = /^[ۖ-ۜ۩]+$/;

export interface WordSpan {
  text: string;
  /** Code-point offsets of the word in the āya text. */
  start: number;
  end: number;
  /** Signs after the word (pause, sajdah), as in the text. */
  after: string;
}

/** The words of an āya with their code-point offsets. */
export function splitWords(text: readonly string[], offset = 0): WordSpan[] {
  const words: WordSpan[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === ' ') {
      i++;
      continue;
    }
    let j = i;
    while (j < text.length && text[j] !== ' ') j++;
    const token = text.slice(i, j).join('');
    if (MARK.test(token)) {
      const previous = words.at(-1);
      if (!previous) throw new Error(`a sign before the first word: ${token}`);
      previous.after += token;
    } else {
      words.push({ text: token, start: i + offset, end: j + offset, after: '' });
    }
    i = j;
  }
  return words;
}

/** Whether a code point is a combining mark (vowel, shadda, sukūn, small letters). */
export const isMark = (c: string): boolean => /\p{Mn}/u.test(c);
