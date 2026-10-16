import {
  IZHAR_EXCEPTIONS,
  RIWAYAT,
  SHEET_EXAMPLES,
  UNIT_EXAMPLES,
  WAQF_SIGNS,
  detect,
  isWaqfRule,
  type ChangeGroup,
  type RiwayaId,
  type RuleId,
  type WaqfSignId,
  type WeightReason,
} from '@arda/tajweed';
import type { Language } from '@/i18n/languages';

/**
 * The rule cards of units 2–8 (spec 01 §4, F2), built from the sheikh's sheet: unit 2 nūn
 * sākina and tanwīn, unit 3 ghunna and mīm sākina, unit 4 qalqala, and beyond the sheet unit 5
 * madd, unit 6 heavy and light letters, unit 7 stopping and starting and unit 8 the riwāyāt
 * (by contrast with Ḥafṣ, ADR-0027: its cards hold no rule of the engine). The examples are the
 * sheet's own and, where the sheet has too few, real words chosen
 * for it (`UNIT_EXAMPLES`);
 * `@arda/tajweed` keeps them and the engine is tested against them. The texts are in the i18n
 * catalogs (`cards`). Until the content pack exists (ADR-0010), this module is the units.
 */

export const UNIT_CARDS = {
  2: ['izhar', 'idgham', 'iqlab', 'ikhfa'],
  3: ['ghunna', 'ikhfa-shafawi', 'idgham-shafawi', 'izhar-shafawi'],
  4: ['qalqala'],
  5: ['madd-tabii', 'madd-muttasil', 'madd-munfasil', 'madd-lazim'],
  6: ['tafkhim', 'lam-jalala', 'ra'],
  7: ['waqf', 'madd-arid', 'waqf-signs', 'ibtida'],
  8: ['riwayat', 'warsh-madd', 'warsh-hamza', 'warsh-sounds', 'other-words'],
} as const;
export type CardUnit = keyof typeof UNIT_CARDS;
export const CARD_UNITS = [2, 3, 4, 5, 6, 7, 8] as const satisfies readonly CardUnit[];

/**
 * The units with a test (ADR-0024): unit 1, the letter lab, since it has all 28 letters
 * (2026-10-09), and the units with rule cards.
 */
export const TEST_UNITS = [1, ...CARD_UNITS] as const;
export type TestUnit = (typeof TEST_UNITS)[number];

export const UNIT2_CARDS = UNIT_CARDS[2];
export type Unit2Card = (typeof UNIT_CARDS)[2][number];
export type Unit3Card = (typeof UNIT_CARDS)[3][number];
export type MaddCard = (typeof UNIT_CARDS)[5][number];
/** The cards of unit 6 whose letter can be heavy or light. */
export type WeightCard = 'lam-jalala' | 'ra';
export type CardId = (typeof UNIT_CARDS)[CardUnit][number];
/** The cards of unit 8 that show what another riwāya reads, one group of changes each. */
export type ChangeCard = Exclude<(typeof UNIT_CARDS)[8][number], 'riwayat'>;
export const CARD_OF_GROUP: Readonly<Record<ChangeGroup, ChangeCard>> = {
  madd: 'warsh-madd',
  hamza: 'warsh-hamza',
  sound: 'warsh-sounds',
  word: 'other-words',
};
export const CHANGE_CARDS: readonly ChangeCard[] = Object.values(CARD_OF_GROUP);

/** The second answer of the qalqala game: the letter does not bounce. */
export const NO_QALQALA = 'no-qalqala';
/**
 * The answers of "How long?" (unit 5): two, four to five, or six counts. Letters only, as the
 * synced review cards store their answer (migration 0007).
 */
export const MADD_LENGTHS = ['two-counts', 'four-counts', 'six-counts'] as const;
export type MaddLength = (typeof MADD_LENGTHS)[number];
/** The answers of "Heavy or light?" (unit 6). */
export const WEIGHTS = ['heavy', 'light'] as const;
export type Weight = (typeof WEIGHTS)[number];
/** The answers of "Stop and start" (unit 7): how a word ends at a stop, how alif waṣla begins. */
export const STOP_ENDINGS = ['stop-sukun', 'stop-alif', 'stop-ha'] as const;
export type StopEnding = (typeof STOP_ENDINGS)[number];
export const START_VOWELS = ['start-fatha', 'start-damma', 'start-kasra'] as const;
export type StartVowel = (typeof START_VOWELS)[number];
/** The answers of "The signs" (unit 7): what each pause sign asks. */
export const SIGN_IDS: readonly WaqfSignId[] = WAQF_SIGNS.map((s) => s.id);
/** The answers of "Ḥafṣ or Warsh?" (unit 8): which riwāya the reciter reads. */
export const HEARD_RIWAYAT = ['hafs', 'warsh'] as const satisfies readonly RiwayaId[];
export type HeardRiwaya = (typeof HEARD_RIWAYAT)[number];
/** The riwāyāt by id, for their Arabic names. */
export const RIWAYA_IDS: readonly RiwayaId[] = RIWAYAT.map((r) => r.id);
/** What a game question can be answered with: a card, "no qalqala", a length, a weight, an
 * ending, a starting vowel, a sign or a riwāya. */
export type AnswerId =
  | CardId
  | typeof NO_QALQALA
  | MaddLength
  | Weight
  | StopEnding
  | StartVowel
  | WaqfSignId
  | HeardRiwaya;

/** How long a madd card's madd is held. */
export const LENGTH_OF_CARD: Readonly<Record<MaddCard, MaddLength>> = {
  'madd-tabii': 'two-counts',
  'madd-muttasil': 'four-counts',
  'madd-munfasil': 'four-counts',
  'madd-lazim': 'six-counts',
};

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
  'madd-tabii': { term: 'Madd ṭabīʿī', arabic: 'مَدّ طَبِيعِيّ' },
  'madd-muttasil': { term: 'Madd muttaṣil', arabic: 'مَدّ مُتَّصِل' },
  'madd-munfasil': { term: 'Madd munfaṣil', arabic: 'مَدّ مُنْفَصِل' },
  'madd-lazim': { term: 'Madd lāzim', arabic: 'مَدّ لَازِم' },
  tafkhim: { term: 'Istiʿlāʾ', arabic: 'حُرُوف الِاسْتِعْلَاء' },
  'lam-jalala': { term: 'Lām al-jalāla', arabic: 'لَام لَفْظ الجَلَالَة' },
  ra: { term: 'Rāʾ', arabic: 'الرَّاء' },
  waqf: { term: 'Waqf', arabic: 'الوَقْف' },
  'madd-arid': { term: 'Madd ʿāriḍ', arabic: 'مَدّ عَارِض لِلسُّكُون' },
  'waqf-signs': { term: 'ʿAlāmāt al-waqf', arabic: 'عَلَامَات الوَقْف' },
  ibtida: { term: 'Ibtidāʾ', arabic: 'الابْتِدَاء' },
  riwayat: { term: 'Riwāyāt', arabic: 'الرِّوَايَات' },
  'warsh-madd': { term: 'Warsh: Madd', arabic: 'المَدّ عِنْدَ وَرْش' },
  'warsh-hamza': { term: 'Warsh: Hamza', arabic: 'الهَمْز عِنْدَ وَرْش' },
  'warsh-sounds': {
    term: 'Warsh: Taqlīl, Rāʾ, Lām',
    arabic: 'التَّقْلِيل وَالتَّرْقِيق وَالتَّغْلِيظ',
  },
  'other-words': { term: 'Farsh al-ḥurūf', arabic: 'فَرْش الحُرُوف' },
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
  /** Why the lām of Allāh or the rāʾ is heavy or light (unit 6). */
  reason?: WeightReason;
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
  'madd-tabii': ['madd-tabii'],
  'madd-muttasil': ['madd-muttasil'],
  'madd-munfasil': ['madd-munfasil'],
  'madd-lazim': ['madd-lazim'],
  tafkhim: ['tafkhim'],
  'lam-jalala': ['lam-heavy', 'lam-light'],
  ra: ['ra-heavy', 'ra-light'],
  waqf: ['waqf-sukun', 'madd-iwad', 'waqf-ha'],
  'madd-arid': ['madd-arid', 'madd-lin'],
  // The signs are no rule of the engine: the card lists them (content/signs.ts).
  'waqf-signs': [],
  ibtida: ['ibtida-fatha', 'ibtida-damma', 'ibtida-kasra'],
  // Unit 8 shows what other riwāyāt read (`RIWAYA_EXAMPLES`), not the engine's rules.
  riwayat: [],
  'warsh-madd': [],
  'warsh-hamza': [],
  'warsh-sounds': [],
  'other-words': [],
};

/** The sheet's examples first, then the ones chosen for units 3–7. */
const EXAMPLES = [...SHEET_EXAMPLES, ...UNIT_EXAMPLES];

/** The example's first occurrence of `rule`. */
function occurrenceOf(text: string, rule: RuleId) {
  // A stop reads the last word differently: only unit 7's examples are read as stopped on.
  const waqf = isWaqfRule(rule);
  const occurrence = detect(text, { madd: true, tafkhim: true, waqf }).find(
    (o) => o.rule === rule
  );
  if (!occurrence) throw new Error(`the sheet example ${text} does not show ${rule}`);
  return occurrence;
}

/** The case of the example's first occurrence of `rule`. */
export function caseOf(text: string, rule: RuleId): RuleCase {
  const occurrence = occurrenceOf(text, rule);
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
        ({ text }) => {
          const { reason } = occurrenceOf(text, rule);
          return { text, case: caseOf(text, rule), ...(reason ? { reason } : {}) };
        }
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
