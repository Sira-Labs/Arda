import { shuffle, type Random } from '@/games/questions';
import { LETTERS, QUIZ_LETTERS, type QuizKind } from './letters';
import type { HeardId, LabLetterId, LabWord, Weight } from './types';
import { LAB_WORDS } from './words';

/** What the learner picks: a letter, or heavy or light for rāʾ. */
export type LabAnswer = HeardId | Weight;

export interface LabQuestion {
  word: LabWord;
  answer: LabAnswer;
}

export const ROUNDS = 10;

/** The answers a quiz offers, in a fixed order. */
export function answersOf(kind: QuizKind): readonly LabAnswer[] {
  return kind === 'weight' ? ['heavy', 'light'] : QUIZ_LETTERS[kind];
}

/**
 * Ten words to hear (spec F5, "Welcher Buchstabe?"). For a letter heard against others: the
 * others' share each (three of three letters, five of two) and the rest its own – four of its
 * own and three of each other whistling letter – so the ear has to tell them apart; for rāʾ:
 * five heavy and five light. Shuffled.
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
    kind !== 'weight'
      ? QUIZ_LETTERS[kind].flatMap((id, _, all) => {
          const each = Math.floor(ROUNDS / all.length);
          return pick(of(id), id === letter ? ROUNDS - each * (all.length - 1) : each);
        })
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
      answer: kind === 'weight' ? (word.weight ?? 'heavy') : (word.letter as HeardId),
    }));
}
