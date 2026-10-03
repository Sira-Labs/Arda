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

/** Their labels (always shown with the colour) live in the i18n catalogs, `rules`. */

/** A piece of Qurʾān text, optionally marked with the family of the rule it shows. */
export interface Segment {
  text: string;
  rule?: RuleFamily;
}
