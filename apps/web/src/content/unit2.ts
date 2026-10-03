import { IZHAR_EXCEPTIONS, SHEET_EXAMPLES, detect, type RuleId } from '@arda/tajweed';
import type { Language } from '@/i18n/languages';

/**
 * Unit 2, nūn sākina and tanwīn (spec 01 §4, F2): four rule cards built from the sheikh's
 * sheet. The examples are the sheet's own (`@arda/tajweed` keeps them, the engine is tested
 * against them); the texts are in the i18n catalogs (`cards`). Until the content pack exists
 * (ADR-0010), this module is the unit.
 */

export const UNIT2_CARDS = ['izhar', 'idgham', 'iqlab', 'ikhfa'] as const;
export type Unit2Card = (typeof UNIT2_CARDS)[number];

/** The card's name: Arabic in the Arabic interface, the transliterated term elsewhere. */
const CARD_NAMES: Record<Unit2Card, { term: string; arabic: string }> = {
  izhar: { term: 'Iẓhār', arabic: 'إِظْهَار' },
  idgham: { term: 'Idghām', arabic: 'إِدْغَام' },
  iqlab: { term: 'Iqlāb', arabic: 'إِقْلَاب' },
  ikhfa: { term: 'Ikhfāʾ', arabic: 'إِخْفَاء' },
};

export function cardName(id: Unit2Card, language: Language): string {
  return language === 'ar' ? CARD_NAMES[id].arabic : CARD_NAMES[id].term;
}

/** The Arabic name, shown large in muṣḥaf script on every card. */
export const cardArabicName = (id: Unit2Card): string => CARD_NAMES[id].arabic;

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
  id: Unit2Card;
  /** The rules the card teaches, one example group each. */
  groups: readonly ExampleGroup[];
  /** Words that look like the rule but keep iẓhār (the idghām card). */
  exceptions: readonly string[];
  /** Where sources differ, the card says so (F2); the text is in `ruleCard.sources`. */
  sourcesDiffer?: 'iqlabGhunna';
  review: Review;
}

const RULES_OF_CARD: Record<Unit2Card, readonly RuleId[]> = {
  izhar: ['izhar'],
  idgham: ['idgham-ghunna', 'idgham-no-ghunna'],
  iqlab: ['iqlab'],
  ikhfa: ['ikhfa'],
};

/** The case of the example's first occurrence of `rule`. */
export function caseOf(text: string, rule: RuleId): RuleCase {
  const occurrence = detect(text).find((o) => o.rule === rule);
  if (!occurrence) throw new Error(`the sheet example ${text} does not show ${rule}`);
  if (occurrence.tanwin) return 'tanwin';
  return occurrence.acrossWords ? 'across' : 'inside';
}

function card(id: Unit2Card): RuleCardContent {
  return {
    id,
    groups: RULES_OF_CARD[id].map((rule) => ({
      rule,
      examples: SHEET_EXAMPLES.filter((example) => example.expectedRule === rule).map(
        ({ text }) => ({ text, case: caseOf(text, rule) })
      ),
    })),
    exceptions: id === 'idgham' ? IZHAR_EXCEPTIONS.map(({ text }) => text) : [],
    ...(id === 'iqlab' ? { sourcesDiffer: 'iqlabGhunna' as const } : {}),
    review: { status: 'draft' },
  };
}

export const UNIT2: Readonly<Record<Unit2Card, RuleCardContent>> = {
  izhar: card('izhar'),
  idgham: card('idgham'),
  iqlab: card('iqlab'),
  ikhfa: card('ikhfa'),
};

export function isUnit2Card(value: string | undefined): value is Unit2Card {
  return (UNIT2_CARDS as readonly string[]).includes(value ?? '');
}
