import type { Letter } from './letters';

/**
 * The colour families of the tajwīd layer (design spec §4, spec 03 §3). The display groups
 * the finer rules into these; iẓhār has none, because clear is the default.
 */
export const RULE_FAMILIES = [
  'ghunna',
  'qalqala',
  'silent',
  'madd-2',
  'madd-4',
  'madd-6',
] as const;
export type RuleFamily = (typeof RULE_FAMILIES)[number];

/** The rules of units 2–4, from the sheikh's sheet (spec 03 §3). */
export const RULE_IDS = [
  'izhar',
  'idgham-ghunna',
  'idgham-no-ghunna',
  'iqlab',
  'ikhfa',
  'izhar-shafawi',
  'idgham-shafawi',
  'ikhfa-shafawi',
  'ghunna-mushaddad',
  'qalqala',
] as const;
export type RuleId = (typeof RULE_IDS)[number];

/** Which sound the rule is about. */
export type RuleSubject = 'nun-sakina-tanwin' | 'mim-sakina' | 'ghunna' | 'qalqala';

export interface Rule {
  id: RuleId;
  subject: RuleSubject;
  /** The rule's name in Arabic, vocalised; the Arabic interface shows it as is (ADR-0020). */
  arabic: string;
  /** The transliterated term; Latin-script interfaces keep it untranslated (ADR-0020). */
  term: string;
  /** Display colour; `null` for the rules that are read clearly. */
  family: RuleFamily | null;
  /** Whether a ghunna of 2 counts is held. */
  ghunna: boolean;
  /** The letters after the nūn or mīm that call for the rule (or the letters themselves). */
  letters: readonly Letter[];
}

const rule = (r: Rule): Rule => r;

/** The rules, in the order the sheet teaches them. */
export const RULES: Readonly<Record<RuleId, Rule>> = {
  izhar: rule({
    id: 'izhar',
    subject: 'nun-sakina-tanwin',
    arabic: 'إِظْهَار حَلْقِيّ',
    term: 'Iẓhār',
    family: null,
    ghunna: false,
    letters: ['ء', 'ه', 'ع', 'ح', 'غ', 'خ'],
  }),
  'idgham-ghunna': rule({
    id: 'idgham-ghunna',
    subject: 'nun-sakina-tanwin',
    arabic: 'إِدْغَام بِغُنَّة',
    term: 'Idghām',
    family: 'ghunna',
    ghunna: true,
    letters: ['ي', 'ن', 'م', 'و'],
  }),
  'idgham-no-ghunna': rule({
    id: 'idgham-no-ghunna',
    subject: 'nun-sakina-tanwin',
    arabic: 'إِدْغَام بِلَا غُنَّة',
    term: 'Idghām',
    family: 'silent',
    ghunna: false,
    letters: ['ل', 'ر'],
  }),
  iqlab: rule({
    id: 'iqlab',
    subject: 'nun-sakina-tanwin',
    arabic: 'إِقْلَاب',
    term: 'Iqlāb',
    family: 'ghunna',
    // Sources differ; the sheet and the app teach it with ghunna (spec 03 §3, ADR-0008).
    ghunna: true,
    letters: ['ب'],
  }),
  ikhfa: rule({
    id: 'ikhfa',
    subject: 'nun-sakina-tanwin',
    arabic: 'إِخْفَاء حَقِيقِيّ',
    term: 'Ikhfāʾ',
    family: 'ghunna',
    ghunna: true,
    // In the order of the mnemonic ṣif dhā thanā kam jāda shakhṣun qad samā / dum ṭayyiban
    // zid fī tuqan ḍaʿ ẓālimā.
    letters: ['ص', 'ذ', 'ث', 'ك', 'ج', 'ش', 'ق', 'س', 'د', 'ط', 'ز', 'ف', 'ت', 'ض', 'ظ'],
  }),
  'izhar-shafawi': rule({
    id: 'izhar-shafawi',
    subject: 'mim-sakina',
    arabic: 'إِظْهَار شَفَوِيّ',
    term: 'Iẓhār shafawī',
    family: null,
    ghunna: false,
    // Every letter but bāʾ and mīm.
    letters: [],
  }),
  'idgham-shafawi': rule({
    id: 'idgham-shafawi',
    subject: 'mim-sakina',
    arabic: 'إِدْغَام شَفَوِيّ',
    term: 'Idghām shafawī',
    family: 'ghunna',
    ghunna: true,
    letters: ['م'],
  }),
  'ikhfa-shafawi': rule({
    id: 'ikhfa-shafawi',
    subject: 'mim-sakina',
    arabic: 'إِخْفَاء شَفَوِيّ',
    term: 'Ikhfāʾ shafawī',
    family: 'ghunna',
    ghunna: true,
    letters: ['ب'],
  }),
  'ghunna-mushaddad': rule({
    id: 'ghunna-mushaddad',
    subject: 'ghunna',
    arabic: 'غُنَّة مُشَدَّدَة',
    term: 'Ghunna',
    family: 'ghunna',
    ghunna: true,
    letters: ['ن', 'م'],
  }),
  qalqala: rule({
    id: 'qalqala',
    subject: 'qalqala',
    arabic: 'قَلْقَلَة',
    term: 'Qalqala',
    family: 'qalqala',
    ghunna: false,
    // quṭbu jadd
    letters: ['ق', 'ط', 'ب', 'ج', 'د'],
  }),
};

/** The four rules of nūn sākina and tanwīn: together they cover every letter exactly once. */
export const NUN_SAKINA_RULES = [
  'izhar',
  'idgham-ghunna',
  'idgham-no-ghunna',
  'iqlab',
  'ikhfa',
] as const;
export type NunSakinaRule = (typeof NUN_SAKINA_RULES)[number];

const NUN_RULE_BY_LETTER: ReadonlyMap<Letter, NunSakinaRule> = new Map(
  NUN_SAKINA_RULES.flatMap((id) =>
    RULES[id].letters.map((letter) => [letter, id] as const)
  )
);

/**
 * The rule for a nūn sākina or tanwīn followed by `letter` across two words. Inside one word,
 * see `detect`: the idghām letters keep iẓhār there (صِنْوَانٌ, قِنْوَانٌ, الدُّنْيَا, بُنْيَانٌ).
 */
export function nunSakinaRule(letter: Letter): NunSakinaRule {
  const id = NUN_RULE_BY_LETTER.get(letter);
  // Unreachable while the taxonomy covers all 28 letters; the test proves it does.
  if (!id) throw new Error(`no nūn sākina rule for ${letter}`);
  return id;
}

export type MimSakinaRule = 'izhar-shafawi' | 'idgham-shafawi' | 'ikhfa-shafawi';

/** The rule for a mīm sākina followed by `letter`. */
export function mimSakinaRule(letter: Letter): MimSakinaRule {
  if (letter === 'ب') return 'ikhfa-shafawi';
  if (letter === 'م') return 'idgham-shafawi';
  return 'izhar-shafawi';
}

export function isQalqalaLetter(letter: Letter): boolean {
  return RULES.qalqala.letters.includes(letter);
}
