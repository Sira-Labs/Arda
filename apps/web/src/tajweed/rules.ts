import { RULES, type RuleFamily, type RuleId } from '@arda/tajweed';
import type { Language } from '@/i18n/languages';

/**
 * The colour families and the rule taxonomy live in `@arda/tajweed` (ADR-0008); their labels,
 * always shown with the colour, live in the i18n catalogs (`rules`).
 */
export { RULE_FAMILIES, type RuleFamily, type RuleId } from '@arda/tajweed';

/**
 * A piece of Qurʾān text. A `carrier` is the letter a rule sits on (coloured by its family,
 * or left clear for iẓhār); a `follower` is the letter after it that decides the rule.
 */
export interface Segment {
  text: string;
  rule?: RuleFamily;
  ruleId?: RuleId;
  role?: 'carrier' | 'follower';
}

/** A rule's name: the Arabic one in the Arabic interface, else the transliterated term. */
export function ruleName(id: RuleId, language: Language): string {
  return language === 'ar' ? RULES[id].arabic : RULES[id].term;
}
