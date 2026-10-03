import type { RuleFamily } from '@arda/tajweed';

/**
 * The colour families and the rule taxonomy live in `@arda/tajweed` (ADR-0008); their labels,
 * always shown with the colour, live in the i18n catalogs (`rules`).
 */
export { RULE_FAMILIES, type RuleFamily } from '@arda/tajweed';

/** A piece of Qurʾān text, optionally marked with the family of the rule it shows. */
export interface Segment {
  text: string;
  rule?: RuleFamily;
}
