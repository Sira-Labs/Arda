import {
  IZHAR_EXCEPTIONS,
  LETTERS,
  SHEET_EXAMPLES,
  UNIT_EXAMPLES,
  detect,
  isMaddRule,
  isQalqalaLetter,
  RULES,
  nunSakinaRule,
  type Letter,
  type Occurrence,
  type RuleId,
  type WeightReason,
} from '@arda/tajweed';
import {
  LENGTH_OF_CARD,
  MADD_LENGTHS,
  NO_QALQALA,
  UNIT_CARDS,
  type AnswerId,
  type CardId,
  type CardUnit,
  type MaddCard,
  type MaddLength,
  type Unit2Card,
  type Weight,
  type WeightCard,
  WEIGHTS,
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
    case 'madd-tabii':
    case 'madd-muttasil':
    case 'madd-munfasil':
    case 'madd-lazim':
    case 'tafkhim':
      return rule;
    case 'lam-heavy':
    case 'lam-light':
      return 'lam-jalala';
    case 'ra-heavy':
    case 'ra-light':
      return 'ra';
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

/** One question of "How long?" (unit 5): a real word, one madd letter in focus. */
export interface MaddQuestion extends NewCard {
  kind: 'madd-length';
  answer: MaddLength;
  /** The madd the word shows, which says why it is that long. */
  card: MaddCard;
  /** The occurrence the question is about (the first of the example's madd). */
  focus: Occurrence;
}

/** One question of "Heavy or light?" (unit 6): a real word, its rāʾ or lām of Allāh in focus. */
export interface WeightQuestion extends NewCard {
  kind: 'weight';
  answer: Weight;
  /** The card that teaches the letter: rāʾ or the lām of Allāh. */
  card: WeightCard;
  /** Why it is heavy or light. */
  reason: WeightReason;
  focus: Occurrence;
}

export type Question =
  WordQuestion | LetterQuestion | QalqalaQuestion | MaddQuestion | WeightQuestion;

/** The answers a question offers: its unit's rule cards, qalqala or not, or three lengths. */
export function optionsOf(question: Question): readonly AnswerId[] {
  switch (question.kind) {
    case 'which-rule':
      return UNIT_CARDS[question.unit];
    case 'sort-letter':
      return UNIT_CARDS[2];
    case 'qalqala-letter':
      return ['qalqala', NO_QALQALA];
    case 'madd-length':
      return MADD_LENGTHS;
    case 'weight':
      return WEIGHTS;
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

/** A "How long?" question for an example of unit 5, or `undefined` for any other rule. */
export function maddQuestion(text: string, rule: RuleId): MaddQuestion | undefined {
  if (!isMaddRule(rule)) return undefined;
  const focus = detect(text, { madd: true }).find((o) => o.rule === rule);
  if (!focus) return undefined;
  return {
    id: `madd-length:${text}`,
    kind: 'madd-length',
    prompt: text,
    answer: LENGTH_OF_CARD[rule],
    card: rule,
    focus,
  };
}

/** Every word of unit 5: four for each madd. */
export const MADD_POOL: readonly MaddQuestion[] = UNIT_EXAMPLES.map((example) =>
  maddQuestion(example.text, example.expectedRule)
).filter((question): question is MaddQuestion => question !== undefined);

/** Ten (or `count`) different words of unit 5 in random order. */
export function maddRound(random: Random, count = 10): MaddQuestion[] {
  return shuffle(MADD_POOL, random).slice(0, count);
}

/** A "Heavy or light?" question for an example of a rāʾ or the lām of Allāh. */
export function weightQuestion(text: string, rule: RuleId): WeightQuestion | undefined {
  const card = cardOfRule(rule);
  const weight = RULES[rule].weight;
  if ((card !== 'ra' && card !== 'lam-jalala') || !weight) return undefined;
  const focus = detect(text, { tafkhim: true }).find((o) => o.rule === rule);
  if (!focus?.reason) return undefined;
  return {
    id: `weight:${text}`,
    kind: 'weight',
    prompt: text,
    answer: weight,
    card,
    reason: focus.reason,
    focus,
  };
}

/** Every word of unit 6 the game asks: four of each weight, for rāʾ and the lām of Allāh. */
export const WEIGHT_POOL: readonly WeightQuestion[] = UNIT_EXAMPLES.map((example) =>
  weightQuestion(example.text, example.expectedRule)
).filter((question): question is WeightQuestion => question !== undefined);

/** Ten (or `count`) different words of unit 6 in random order. */
export function weightRound(random: Random, count = 10): WeightQuestion[] {
  return shuffle(WEIGHT_POOL, random).slice(0, count);
}

/** Questions in a unit test (ADR-0024); 8 right of them pass it. */
export const UNIT_TEST_SIZE = 10;

/**
 * A unit's test: ten questions from what the unit taught, in random order. Unit 2 mixes six
 * words with four letters to sort; unit 3 asks ten words; unit 4 the five qalqala letters among
 * five others, so guessing "qalqala" every time cannot pass it; unit 5 three words of two counts,
 * four of four to five and three of six, so no single length passes it either; unit 6 five
 * heavy and five light (three rāʾ and two lām of Allāh each).
 */
export function unitTest(unit: CardUnit, random: Random): Question[] {
  switch (unit) {
    case 2:
      return shuffle(
        [
          ...shuffle(WORD_POOL, random).slice(0, 6),
          ...shuffle(LETTERS, random).slice(0, 4).map(letterQuestion),
        ],
        random
      );
    case 3:
      return shuffle(UNIT3_POOL, random).slice(0, UNIT_TEST_SIZE);
    case 4: {
      const bouncing = LETTERS.filter(isQalqalaLetter);
      const others = shuffle(
        LETTERS.filter((letter) => !isQalqalaLetter(letter)),
        random
      ).slice(0, UNIT_TEST_SIZE - bouncing.length);
      return shuffle([...bouncing, ...others], random).map(qalqalaQuestion);
    }
    case 5: {
      const of = (card: MaddCard, count: number) =>
        shuffle(
          MADD_POOL.filter((question) => question.card === card),
          random
        ).slice(0, count);
      return shuffle(
        [
          ...of('madd-tabii', 3),
          ...of('madd-muttasil', 2),
          ...of('madd-munfasil', 2),
          ...of('madd-lazim', 3),
        ],
        random
      );
    }
    case 6: {
      const of = (card: WeightCard, weight: Weight, count: number) =>
        shuffle(
          WEIGHT_POOL.filter((q) => q.card === card && q.answer === weight),
          random
        ).slice(0, count);
      return shuffle(
        [
          ...of('ra', 'heavy', 3),
          ...of('ra', 'light', 3),
          ...of('lam-jalala', 'heavy', 2),
          ...of('lam-jalala', 'light', 2),
        ],
        random
      );
    }
  }
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
  if (card.kind === 'madd-length') {
    return MADD_POOL.find((question) => question.id === card.id);
  }
  if (card.kind === 'weight') {
    return WEIGHT_POOL.find((question) => question.id === card.id);
  }
  return [...WORD_POOL, ...UNIT3_POOL].find((question) => question.id === card.id);
}
