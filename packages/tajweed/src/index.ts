/**
 * @arda/tajweed: the rule taxonomy, the letter classes and rule detection (ADR-0008).
 * Pure TypeScript without I/O, shared by the web app and the api.
 */
export { LETTERS, type Letter, letterOf, graphemes, type Grapheme } from './letters';
export {
  RULE_FAMILIES,
  type RuleFamily,
  RULE_IDS,
  type RuleId,
  type Rule,
  type RuleSubject,
  RULES,
  NUN_SAKINA_RULES,
  type NunSakinaRule,
  nunSakinaRule,
  type MimSakinaRule,
  mimSakinaRule,
  isQalqalaLetter,
} from './rules';
export { detect, type Occurrence } from './detect';
export { SHEET_EXAMPLES, IZHAR_EXCEPTIONS, type SheetExample } from './sheet';
export {
  PACK_RULE_IDS,
  type PackRuleId,
  type PackRule,
  PACK_RULES,
  isPackRuleId,
} from './content';
