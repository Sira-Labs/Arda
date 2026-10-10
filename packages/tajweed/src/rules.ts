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
  'tafkhim',
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
  'madd-tabii',
  'madd-muttasil',
  'madd-munfasil',
  'madd-lazim',
  'tafkhim',
  'lam-heavy',
  'lam-light',
  'ra-heavy',
  'ra-light',
] as const;
export type RuleId = (typeof RULE_IDS)[number];

/** The madd rules of unit 5 (spec 01, the path; spec 03 §4b): found by `detect` only when asked (`madd: true`). */
export const MADD_RULES = [
  'madd-tabii',
  'madd-muttasil',
  'madd-munfasil',
  'madd-lazim',
] as const;
export type MaddRule = (typeof MADD_RULES)[number];

/**
 * The heavy and light letters of unit 6 (spec 03 §4c): found by `detect` only when asked
 * (`tafkhim: true`).
 */
export const WEIGHT_RULES = [
  'tafkhim',
  'lam-heavy',
  'lam-light',
  'ra-heavy',
  'ra-light',
] as const;
export type WeightRule = (typeof WEIGHT_RULES)[number];

/** Which sound the rule is about. */
export type RuleSubject =
  'nun-sakina-tanwin' | 'mim-sakina' | 'ghunna' | 'qalqala' | 'madd' | 'tafkhim';

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
  /**
   * How long a madd is held, in counts (ḥarakāt): fewest and most in Ḥafṣ by way of
   * ash-Shāṭibiyya, the reading of the sheikh's muṣḥaf. Absent for the other rules.
   */
  counts?: readonly [number, number];
  /** Whether the letter is heavy (tafkhīm) or light (tarqīq), for the rules of unit 6. */
  weight?: 'heavy' | 'light';
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
  // The madd letters are alif after fatḥa, wāw sākina after ḍamma and yāʾ sākina after kasra
  // (and the small alif, wāw and yāʾ the muṣḥaf writes for them); what follows them decides
  // the madd. The alif is not one of the 28 (hamza stands for it), so `letters` names what
  // decides the madd: the hamza, or nothing for the natural madd.
  'madd-tabii': rule({
    id: 'madd-tabii',
    subject: 'madd',
    arabic: 'مَدّ طَبِيعِيّ',
    term: 'Madd ṭabīʿī',
    family: 'madd-2',
    ghunna: false,
    letters: [],
    counts: [2, 2],
  }),
  'madd-muttasil': rule({
    id: 'madd-muttasil',
    subject: 'madd',
    arabic: 'مَدّ مُتَّصِل',
    term: 'Madd muttaṣil',
    family: 'madd-4',
    ghunna: false,
    letters: ['ء'],
    counts: [4, 5],
  }),
  'madd-munfasil': rule({
    id: 'madd-munfasil',
    subject: 'madd',
    arabic: 'مَدّ مُنْفَصِل',
    term: 'Madd munfaṣil',
    family: 'madd-4',
    ghunna: false,
    letters: ['ء'],
    counts: [4, 5],
  }),
  // A shadda or sukūn after the madd letter in the same word (al-kalimī al-muthaqqal or
  // al-mukhaffaf; the letters at the start of some sūras are taught with the cards).
  'madd-lazim': rule({
    id: 'madd-lazim',
    subject: 'madd',
    arabic: 'مَدّ لَازِم',
    term: 'Madd lāzim',
    family: 'madd-6',
    ghunna: false,
    letters: [],
    counts: [6, 6],
  }),
  // The seven letters of istiʿlāʾ, as the mnemonic orders them: خُصَّ ضَغْطٍ قِظْ. The back of
  // the tongue rises, so they are always heavy; every other letter is light but for the lām of
  // Allāh, the rāʾ and the alif after a heavy letter.
  tafkhim: rule({
    id: 'tafkhim',
    subject: 'tafkhim',
    arabic: 'تَفْخِيم',
    term: 'Tafkhīm',
    family: 'tafkhim',
    ghunna: false,
    letters: ['خ', 'ص', 'ض', 'غ', 'ط', 'ق', 'ظ'],
    weight: 'heavy',
  }),
  // The lām of the name Allāh: heavy after fatḥa or ḍamma, light after kasra.
  'lam-heavy': rule({
    id: 'lam-heavy',
    subject: 'tafkhim',
    arabic: 'تَفْخِيم اللَّام',
    term: 'Tafkhīm al-lām',
    family: 'tafkhim',
    ghunna: false,
    letters: [],
    weight: 'heavy',
  }),
  'lam-light': rule({
    id: 'lam-light',
    subject: 'tafkhim',
    arabic: 'تَرْقِيق اللَّام',
    term: 'Tarqīq al-lām',
    family: null,
    ghunna: false,
    letters: [],
    weight: 'light',
  }),
  'ra-heavy': rule({
    id: 'ra-heavy',
    subject: 'tafkhim',
    arabic: 'تَفْخِيم الرَّاء',
    term: 'Tafkhīm ar-rāʾ',
    family: 'tafkhim',
    ghunna: false,
    letters: [],
    weight: 'heavy',
  }),
  'ra-light': rule({
    id: 'ra-light',
    subject: 'tafkhim',
    arabic: 'تَرْقِيق الرَّاء',
    term: 'Tarqīq ar-rāʾ',
    family: null,
    ghunna: false,
    letters: [],
    weight: 'light',
  }),
};

export const isMaddRule = (rule: RuleId): rule is MaddRule =>
  (MADD_RULES as readonly RuleId[]).includes(rule);

export const isWeightRule = (rule: RuleId): rule is WeightRule =>
  (WEIGHT_RULES as readonly RuleId[]).includes(rule);

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
