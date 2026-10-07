import {
  IZHAR_EXCEPTIONS,
  SHEET_EXAMPLES,
  UNIT_EXAMPLES,
  detect,
  type RuleId,
} from '@arda/tajweed';
import type { Language } from '@/i18n/languages';

/**
 * The rule cards of units 2–4 (spec 01 §4, F2), built from the sheikh's sheet: unit 2 nūn
 * sākina and tanwīn, unit 3 ghunna and mīm sākina, unit 4 qalqala. The examples are the
 * sheet's own and, where the sheet has too few, real words chosen for it (`UNIT_EXAMPLES`);
 * `@arda/tajweed` keeps them and the engine is tested against them. The texts are in the i18n
 * catalogs (`cards`). Until the content pack exists (ADR-0010), this module is the units.
 */

export const UNIT_CARDS = {
  2: ['izhar', 'idgham', 'iqlab', 'ikhfa'],
  3: ['ghunna', 'ikhfa-shafawi', 'idgham-shafawi', 'izhar-shafawi'],
  4: ['qalqala'],
} as const;
export type CardUnit = keyof typeof UNIT_CARDS;
export const CARD_UNITS = [2, 3, 4] as const satisfies readonly CardUnit[];

export const UNIT2_CARDS = UNIT_CARDS[2];
export type Unit2Card = (typeof UNIT_CARDS)[2][number];
export type Unit3Card = (typeof UNIT_CARDS)[3][number];
export type CardId = (typeof UNIT_CARDS)[CardUnit][number];

/** The second answer of the qalqala game: the letter does not bounce. */
export const NO_QALQALA = 'no-qalqala';
/** What a game question can be answered with: a rule card, or "no qalqala". */
export type AnswerId = CardId | typeof NO_QALQALA;

/** The card's name: Arabic in the Arabic interface, the transliterated term elsewhere. */
const CARD_NAMES: Record<CardId, { term: string; arabic: string }> = {
  izhar: { term: 'Iẓhār', arabic: 'إِظْهَار' },
  idgham: { term: 'Idghām', arabic: 'إِدْغَام' },
  iqlab: { term: 'Iqlāb', arabic: 'إِقْلَاب' },
  ikhfa: { term: 'Ikhfāʾ', arabic: 'إِخْفَاء' },
  ghunna: { term: 'Ghunna', arabic: 'غُنَّة' },
  'ikhfa-shafawi': { term: 'Ikhfāʾ shafawī', arabic: 'إِخْفَاء شَفَوِيّ' },
  'idgham-shafawi': { term: 'Idghām shafawī', arabic: 'إِدْغَام شَفَوِيّ' },
  'izhar-shafawi': { term: 'Iẓhār shafawī', arabic: 'إِظْهَار شَفَوِيّ' },
  qalqala: { term: 'Qalqala', arabic: 'قَلْقَلَة' },
};

export function cardName(id: CardId, language: Language): string {
  return language === 'ar' ? CARD_NAMES[id].arabic : CARD_NAMES[id].term;
}

/** The Arabic name, shown large in muṣḥaf script on every card. */
export const cardArabicName = (id: CardId): string => CARD_NAMES[id].arabic;

/** The unit a card belongs to. */
export function unitOf(id: CardId): CardUnit {
  return CARD_UNITS.find((unit) => (UNIT_CARDS[unit] as readonly string[]).includes(id))!;
}

/** Where a case of the rule happens (F2: three cases where they exist). */
export type RuleCase = 'inside' | 'across' | 'tanwin';

export interface CardExample {
  text: string;
  case: RuleCase;
}

export interface ExampleGroup {
  rule: RuleId;
  examples: readonly CardExample[];
}

/** Spec 03 §6: every text is a draft until the sheikh has reviewed it. */
export interface Review {
  status: 'draft' | 'reviewed';
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface RuleCardContent {
  id: CardId;
  /** The rules the card teaches, one example group each. */
  groups: readonly ExampleGroup[];
  /** Words that look like the rule but keep iẓhār (the idghām card). */
  exceptions: readonly string[];
  /** Where sources differ, the card says so (F2); the text is in `ruleCard.sources`. */
  sourcesDiffer?: 'iqlabGhunna';
  review: Review;
}

const RULES_OF_CARD: Record<CardId, readonly RuleId[]> = {
  izhar: ['izhar'],
  idgham: ['idgham-ghunna', 'idgham-no-ghunna'],
  iqlab: ['iqlab'],
  ikhfa: ['ikhfa'],
  ghunna: ['ghunna-mushaddad'],
  'ikhfa-shafawi': ['ikhfa-shafawi'],
  'idgham-shafawi': ['idgham-shafawi'],
  'izhar-shafawi': ['izhar-shafawi'],
  qalqala: ['qalqala'],
};

/** The sheet's examples first, then the ones chosen for units 3 and 4. */
const EXAMPLES = [...SHEET_EXAMPLES, ...UNIT_EXAMPLES];

/** The case of the example's first occurrence of `rule`. */
export function caseOf(text: string, rule: RuleId): RuleCase {
  const occurrence = detect(text).find((o) => o.rule === rule);
  if (!occurrence) throw new Error(`the sheet example ${text} does not show ${rule}`);
  if (occurrence.tanwin) return 'tanwin';
  return occurrence.acrossWords ? 'across' : 'inside';
}

/** Builds a card from the examples: one group per rule, each example with its case. */
function card(id: CardId): RuleCardContent {
  return {
    id,
    groups: RULES_OF_CARD[id].map((rule) => ({
      rule,
      examples: EXAMPLES.filter((example) => example.expectedRule === rule).map(
        ({ text }) => ({ text, case: caseOf(text, rule) })
      ),
    })),
    exceptions: id === 'idgham' ? IZHAR_EXCEPTIONS.map(({ text }) => text) : [],
    ...(id === 'iqlab' ? { sourcesDiffer: 'iqlabGhunna' as const } : {}),
    review: { status: 'draft' },
  };
}

export const CARDS: Readonly<Record<CardId, RuleCardContent>> = Object.fromEntries(
  CARD_UNITS.flatMap((unit) => UNIT_CARDS[unit]).map((id) => [id, card(id)])
) as Record<CardId, RuleCardContent>;

/** Unit 2's cards (the games and assignments of unit 2 use them). */
export const UNIT2 = CARDS as Readonly<Record<Unit2Card, RuleCardContent>>;

/** Whether route parameters name a unit of cards. */
export function isCardUnit(value: string | undefined): value is `${CardUnit}` {
  return CARD_UNITS.some((unit) => String(unit) === value);
}

/** Whether a route parameter names a card of `unit`. */
export function isCardOf(unit: CardUnit, value: string | undefined): value is CardId {
  return (UNIT_CARDS[unit] as readonly string[]).includes(value ?? '');
}
