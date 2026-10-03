import {
  IZHAR_EXCEPTIONS,
  LETTERS,
  SHEET_EXAMPLES,
  detect,
  nunSakinaRule,
  type Letter,
  type Occurrence,
  type RuleId,
} from '@arda/tajweed';
import type { Unit2Card } from '@/content/unit2';
import type { NewCard } from '@/review/leitner';

/** The card that teaches a nūn sākina rule; both idghām rules share one. */
export function cardOfRule(rule: RuleId): Unit2Card | undefined {
  switch (rule) {
    case 'izhar':
      return 'izhar';
    case 'idgham-ghunna':
    case 'idgham-no-ghunna':
      return 'idgham';
    case 'iqlab':
      return 'iqlab';
    case 'ikhfa':
      return 'ikhfa';
    default:
      return undefined;
  }
}

/** One question of "Which rule?": a real word of the sheet, its nūn or tanwīn in focus. */
export interface WordQuestion extends NewCard {
  kind: 'which-rule';
  /** The occurrence the question is about (the first of the expected rule). */
  focus: Occurrence;
}

/** One question of "Sort the 28" (or its review): which rule after nūn sākina? */
export interface LetterQuestion extends NewCard {
  kind: 'sort-letter';
  prompt: Letter;
}

export type Question = WordQuestion | LetterQuestion;

/** A source of randomness in [0, 1); injected so tests are deterministic. */
export type Random = () => number;

/** Fisher–Yates on a copy. */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/** A word question for one of the sheet's texts, or `undefined` if it shows no nūn rule. */
export function wordQuestion(text: string, rule: RuleId): WordQuestion | undefined {
  const answer = cardOfRule(rule);
  const focus = detect(text).find((o) => o.rule === rule);
  if (!answer || !focus) return undefined;
  return { id: `which-rule:${text}`, kind: 'which-rule', prompt: text, answer, focus };
}

/** Every word of unit 2 the game can ask: the sheet's nūn sākina examples and its exceptions. */
export const WORD_POOL: readonly WordQuestion[] = [...SHEET_EXAMPLES, ...IZHAR_EXCEPTIONS]
  // The muṣḥaf's small mīm (ۢ) would give iqlāb away; the plain spelling of the word is asked.
  .filter((example) => !/[\u06E2\u06ED]/u.test(example.text))
  .map((example) => wordQuestion(example.text, example.expectedRule))
  .filter((question): question is WordQuestion => question !== undefined);

/** Ten (or `count`) different words in random order. */
export function whichRuleRound(random: Random, count = 10): WordQuestion[] {
  return shuffle(WORD_POOL, random).slice(0, count);
}

export function letterQuestion(letter: Letter): LetterQuestion {
  // Every letter has a nūn sākina rule (tested in @arda/tajweed), so the card always exists.
  const answer = cardOfRule(nunSakinaRule(letter)) as Unit2Card;
  return { id: `sort:${letter}`, kind: 'sort-letter', prompt: letter, answer };
}

/** All 28 letters in random order. */
export function sortRound(random: Random): LetterQuestion[] {
  return shuffle(LETTERS, random).map(letterQuestion);
}

/** Turns a stored review card back into a question, or `undefined` if its content is gone. */
export function questionOf(card: NewCard): Question | undefined {
  if (card.kind === 'sort-letter') {
    return (LETTERS as readonly string[]).includes(card.prompt)
      ? letterQuestion(card.prompt as Letter)
      : undefined;
  }
  return WORD_POOL.find((question) => question.id === card.id);
}
