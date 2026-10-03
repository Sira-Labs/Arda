/**
 * The colour families of the tajwīd layer (docs/spec/04-design-system.md, ADR-0008) and the
 * label each one carries. The engine (packages/tajweed, next) assigns finer rules; the
 * display groups them into these families, following the common tajwīd-muṣḥaf convention.
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

/** German labels the learner reads next to every colour (never colour alone). */
export const RULE_LABELS: Record<RuleFamily, { name: string; hint: string }> = {
  ghunna: { name: 'Ghunna', hint: 'Nasenklang, 2 Zählzeiten (Ikhfāʾ, Idghām, Iqlāb)' },
  qalqala: { name: 'Qalqala', hint: 'Rückprall bei ق ط ب ج د mit Sukūn' },
  silent: { name: 'Stumm', hint: 'geschrieben, nicht gesprochen' },
  'madd-2': { name: 'Madd 2', hint: 'natürliche Dehnung, 2 Zählzeiten' },
  'madd-4': { name: 'Madd 4–5', hint: 'verbundene oder getrennte Dehnung' },
  'madd-6': { name: 'Madd 6', hint: 'notwendige Dehnung, 6 Zählzeiten' },
};

/** A piece of Qurʾān text, optionally marked with the family of the rule it shows. */
export interface Segment {
  text: string;
  rule?: RuleFamily;
}
