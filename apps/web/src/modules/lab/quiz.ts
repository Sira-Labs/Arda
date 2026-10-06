import { shuffle, type Random } from '@/games/questions';
import { LETTERS, WHISTLING, type QuizKind } from './letters';
import type { LabLetterId, LabWord, Weight, WhistlingId } from './types';
import { LAB_WORDS } from './words';

/** What the learner picks: a whistling letter, or heavy or light for rāʾ. */
export type LabAnswer = WhistlingId | Weight;

export interface LabQuestion {
  word: LabWord;
  answer: LabAnswer;
}

export const ROUNDS = 10;

/** The answers a quiz offers, in a fixed order. */
export function answersOf(kind: QuizKind): readonly LabAnswer[] {
  return kind === 'whistling' ? WHISTLING : ['heavy', 'light'];
}

/**
 * Ten words to hear (spec F5, "Welcher Buchstabe?"). For a whistling letter: four of its own
 * words and three of each of the other two, so the ear has to tell them apart; for rāʾ: five
 * heavy and five light. Shuffled.
 */
export function labRound(
  letter: LabLetterId,
  random: Random = Math.random
): LabQuestion[] {
  const kind = LETTERS[letter].quiz;
  const pick = (words: readonly LabWord[], count: number) =>
    shuffle(words, random).slice(0, count);
  const of = (id: LabLetterId) => LAB_WORDS.filter((w) => w.letter === id);
  const words =
    kind === 'whistling'
      ? WHISTLING.flatMap((id) => pick(of(id), id === letter ? 4 : 3))
      : (['heavy', 'light'] as const).flatMap((weight) =>
          pick(
            of('ra').filter((w) => w.weight === weight),
            ROUNDS / 2
          )
        );
  return shuffle(words, random)
    .slice(0, ROUNDS)
    .map((word) => ({
      word,
      answer:
        kind === 'whistling' ? (word.letter as WhistlingId) : (word.weight ?? 'heavy'),
    }));
}
