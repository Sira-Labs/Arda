import {
  IZHAR_EXCEPTIONS,
  LETTERS,
  SHEET_EXAMPLES,
  UNIT_EXAMPLES,
  detect,
  isQalqalaLetter,
  nunSakinaRule,
  type Letter,
  type Occurrence,
  type RuleId,
} from '@arda/tajweed';
import {
  NO_QALQALA,
  UNIT_CARDS,
  type AnswerId,
  type CardId,
  type Unit2Card,
} from '@/content/units';
import type { NewCard } from '@/review/leitner';

/** The card that teaches a rule; both idghām rules of unit 2 share one. */
export function cardOfRule(rule: RuleId): CardId | undefined {
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
    case 'ghunna-mushaddad':
      return 'ghunna';
    case 'ikhfa-shafawi':
    case 'idgham-shafawi':
    case 'izhar-shafawi':
    case 'qalqala':
      return rule;
    default:
      return undefined;
  }
}

/** The unit whose game asks a word: 2 for nūn sākina and tanwīn, 3 for ghunna and mīm. */
export type WordUnit = 2 | 3;

/** One question of "Which rule?": a real word, its nūn, tanwīn or mīm in focus. */
export interface WordQuestion extends NewCard {
  kind: 'which-rule';
  unit: WordUnit;
  answer: CardId;
  /** The occurrence the question is about (the first of the expected rule). */
  focus: Occurrence;
}

/** One question of "Sort the 28" (or its review): which rule after nūn sākina? */
export interface LetterQuestion extends NewCard {
  kind: 'sort-letter';
  prompt: Letter;
  answer: Unit2Card;
}

/** One question of the qalqala letters: does this letter bounce back with sukūn? */
export interface QalqalaQuestion extends NewCard {
  kind: 'qalqala-letter';
  prompt: Letter;
}

export type Question = WordQuestion | LetterQuestion | QalqalaQuestion;

/** The answers a question offers: its unit's rule cards, or qalqala and "no qalqala". */
export function optionsOf(question: Question): readonly AnswerId[] {
  switch (question.kind) {
    case 'which-rule':
      return UNIT_CARDS[question.unit];
    case 'sort-letter':
      return UNIT_CARDS[2];
    case 'qalqala-letter':
      return ['qalqala', NO_QALQALA];
  }
}

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

const UNIT_OF_CARD: Partial<Record<CardId, WordUnit>> = {
  izhar: 2,
  idgham: 2,
  iqlab: 2,
  ikhfa: 2,
  ghunna: 3,
  'ikhfa-shafawi': 3,
  'idgham-shafawi': 3,
  'izhar-shafawi': 3,
};

/** A word question for an example, or `undefined` if no word game asks its rule. */
export function wordQuestion(text: string, rule: RuleId): WordQuestion | undefined {
  const answer = cardOfRule(rule);
  const unit = answer && UNIT_OF_CARD[answer];
  const focus = detect(text).find((o) => o.rule === rule);
  if (!answer || !unit || !focus) return undefined;
  return {
    id: `which-rule:${text}`,
    kind: 'which-rule',
    unit,
    prompt: text,
    answer,
    focus,
  };
}

const wordsOf = (unit: WordUnit): WordQuestion[] =>
  [...SHEET_EXAMPLES, ...IZHAR_EXCEPTIONS, ...UNIT_EXAMPLES]
    // The muṣḥaf's small mīm (ۢ) would give iqlāb away; the plain spelling of the word is asked.
    .filter((example) => !/[ۭۢ]/u.test(example.text))
    .map((example) => wordQuestion(example.text, example.expectedRule))
    .filter((question): question is WordQuestion => question?.unit === unit);

/** Every word of unit 2 the game can ask: the sheet's nūn sākina examples and its exceptions. */
export const WORD_POOL: readonly WordQuestion[] = wordsOf(2);

/** Every word of unit 3: the ghunna of a shadda and the three mīm sākina rules. */
export const UNIT3_POOL: readonly WordQuestion[] = wordsOf(3);

/** Ten (or `count`) different words of unit 2 in random order. */
export function whichRuleRound(random: Random, count = 10): WordQuestion[] {
  return shuffle(WORD_POOL, random).slice(0, count);
}

/** Ten (or `count`) different words of unit 3 in random order. */
export function unit3Round(random: Random, count = 10): WordQuestion[] {
  return shuffle(UNIT3_POOL, random).slice(0, count);
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

export function qalqalaQuestion(letter: Letter): QalqalaQuestion {
  return {
    id: `qalqala:${letter}`,
    kind: 'qalqala-letter',
    prompt: letter,
    answer: isQalqalaLetter(letter) ? 'qalqala' : NO_QALQALA,
  };
}

/** All 28 letters in random order: five of them are quṭbu jadd. */
export function qalqalaRound(random: Random): QalqalaQuestion[] {
  return shuffle(LETTERS, random).map(qalqalaQuestion);
}

const isLetter = (value: string): value is Letter =>
  (LETTERS as readonly string[]).includes(value);

/** Turns a stored review card back into a question, or `undefined` if its content is gone. */
export function questionOf(card: NewCard): Question | undefined {
  if (card.kind === 'sort-letter') {
    return isLetter(card.prompt) ? letterQuestion(card.prompt) : undefined;
  }
  if (card.kind === 'qalqala-letter') {
    return isLetter(card.prompt) ? qalqalaQuestion(card.prompt) : undefined;
  }
  return [...WORD_POOL, ...UNIT3_POOL].find((question) => question.id === card.id);
}
