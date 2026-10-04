import type { PackWord } from '@arda/quran';
import { PACK_RULES, type PackRuleId } from '@arda/tajweed';
import type { Language } from '@/i18n/languages';
import type { Messages } from '@/i18n/messages';
import { ruleName, type Segment } from '@/tajweed/rules';

export type MushafWord = PackWord<PackRuleId>;

interface Mark {
  id: PackRuleId;
  follower: boolean;
}

/**
 * The word cut into pieces by its rules, for TajweedText. Where rules overlap, a coloured
 * rule wins over the follower of another (the madd inside the letter after a nūn, say), and
 * the first coloured rule over a later one.
 */
export function wordSegments(word: MushafWord): Segment[] {
  const marks: (Mark | null)[] = Array.from({ length: word.t.length }, () => null);
  const spans = word.r ?? [];
  for (const [start, end, id, role] of spans) {
    if (role !== 'f') continue;
    for (let i = start; i < end; i++) marks[i] ??= { id, follower: true };
  }
  for (const [start, end, id, role] of spans) {
    if (role === 'f') continue;
    for (let i = start; i < end; i++) {
      if (!marks[i] || marks[i]!.follower) marks[i] = { id, follower: false };
    }
  }
  const segments: Segment[] = [];
  let from = 0;
  for (let i = 1; i <= word.t.length; i++) {
    const a = marks[i - 1];
    const b = marks[i];
    if (i < word.t.length && a?.id === b?.id && a?.follower === b?.follower) continue;
    const text = word.t.slice(from, i);
    from = i;
    if (!a) {
      segments.push({ text });
    } else if (a.follower) {
      segments.push({ text, role: 'follower' });
    } else {
      const rule = PACK_RULES[a.id];
      segments.push({
        text,
        rule: rule.family,
        ...(rule.rule ? { ruleId: rule.rule } : {}),
        ...(rule.decidedByNext ? { role: 'carrier' as const } : {}),
      });
    }
  }
  return segments;
}

/** A pack rule's name: the sheet's name for its rules, else its own term, else the family. */
export function packRuleName(id: PackRuleId, language: Language, m: Messages): string {
  const rule = PACK_RULES[id];
  if (rule.rule) {
    const variant = m.assignments.variant(rule.rule);
    return `${ruleName(rule.rule, language)}${variant ? ` ${variant}` : ''}`;
  }
  if (rule.name) return language === 'ar' ? rule.name.arabic : rule.name.term;
  return m.rules[rule.family].name;
}

/** The rules a word carries (each once), and the rules it decides as the next letter. */
export function wordRules(word: MushafWord): {
  carries: PackRuleId[];
  decides: PackRuleId[];
} {
  const carries: PackRuleId[] = [];
  const decides: PackRuleId[] = [];
  for (const [, , id, role] of word.r ?? []) {
    const list = role === 'f' ? decides : carries;
    if (!list.includes(id)) list.push(id);
  }
  return { carries, decides };
}
