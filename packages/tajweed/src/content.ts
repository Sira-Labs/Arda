import type { RuleFamily, RuleId } from './rules';

/**
 * The rule names in the content packs: cpfair/quran-tajweed's 18 categories as the data spells them (CC BY 4.0,
 * ADR-0008), kept verbatim so the data stays traceable to its source.
 */
export const PACK_RULE_IDS = [
  'ghunnah',
  'idghaam_ghunnah',
  'idghaam_no_ghunnah',
  'idghaam_mutajanisayn',
  'idghaam_mutaqaribayn',
  'idghaam_shafawi',
  'ikhfa',
  'ikhfa_shafawi',
  'iqlab',
  'madd_2',
  'madd_246',
  'madd_muttasil',
  'madd_munfasil',
  'madd_6',
  'qalqalah',
  'hamzat_wasl',
  'lam_shamsiyyah',
  'silent',
] as const;
export type PackRuleId = (typeof PACK_RULE_IDS)[number];

export interface PackRule {
  /** The colour family it is drawn in (spec 03 §3, design spec §4). */
  family: RuleFamily;
  /** The rule of units 2–4 it is, when the sheet teaches it; later units add the rest. */
  rule: RuleId | null;
  /**
   * Whether the span is "the nūn or mīm, then the letter that decides": the first letter is
   * the carrier, the rest is the follower (shown, not coloured).
   */
  decidedByNext: boolean;
  /**
   * The rule's name for the rules later units teach: the transliterated term and the Arabic
   * name, kept as terms in every language (ADR-0020). `null` for the sheet's rules, which are
   * named by `RULES`, and for silent letters, which the family names.
   */
  name: { term: string; arabic: string } | null;
}

const r = (
  family: RuleFamily,
  rule: RuleId | null,
  decidedByNext = false,
  name: PackRule['name'] = null
): PackRule => ({ family, rule, decidedByNext, name });
const named = (family: RuleFamily, term: string, arabic: string): PackRule =>
  r(family, null, false, { term, arabic });

/** How each pack rule is drawn and which rule of the sheet it is. */
export const PACK_RULES: Readonly<Record<PackRuleId, PackRule>> = {
  ghunnah: r('ghunna', 'ghunna-mushaddad'),
  idghaam_ghunnah: r('ghunna', 'idgham-ghunna', true),
  idghaam_no_ghunnah: r('silent', 'idgham-no-ghunna', true),
  // Two letters of (nearly) the same place: the first is not pronounced (unit 7).
  idghaam_mutajanisayn: named('silent', 'Idghām mutajānisayn', 'إِدْغَام مُتَجَانِسَيْن'),
  idghaam_mutaqaribayn: named('silent', 'Idghām mutaqāribayn', 'إِدْغَام مُتَقَارِبَيْن'),
  idghaam_shafawi: r('ghunna', 'idgham-shafawi', true),
  ikhfa: r('ghunna', 'ikhfa', true),
  ikhfa_shafawi: r('ghunna', 'ikhfa-shafawi', true),
  iqlab: r('ghunna', 'iqlab', true),
  madd_2: named('madd-2', 'Madd ṭabīʿī', 'مَدّ طَبِيعِيّ'),
  // ʿĀriḍ li-s-sukūn and līn: 2, 4 or 6 counts when stopping; drawn as the light madd.
  madd_246: named('madd-2', 'Madd ʿāriḍ', 'مَدّ عَارِض لِلسُّكُون'),
  madd_muttasil: named('madd-4', 'Madd muttaṣil', 'مَدّ مُتَّصِل'),
  madd_munfasil: named('madd-4', 'Madd munfaṣil', 'مَدّ مُنْفَصِل'),
  madd_6: named('madd-6', 'Madd lāzim', 'مَدّ لَازِم'),
  qalqalah: r('qalqala', 'qalqala'),
  hamzat_wasl: named('silent', 'Hamzat al-waṣl', 'هَمْزَة الوَصْل'),
  lam_shamsiyyah: named('silent', 'Lām shamsiyya', 'لَام شَمْسِيَّة'),
  silent: r('silent', null),
};

export function isPackRuleId(value: unknown): value is PackRuleId {
  return (
    typeof value === 'string' && (PACK_RULE_IDS as readonly string[]).includes(value)
  );
}
