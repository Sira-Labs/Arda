import type { PackWord } from '@arda/quran';
import { PACK_RULES, isPackRuleId } from '@arda/tajweed';
import { UNIT_CARDS, cardName, type CardUnit } from '@/content/units';
import { cardOfRule } from '@/games/questions';
import type { Language } from '@/i18n/languages';
import type { Messages } from '@/i18n/messages';
import type { RuleTopic } from '@/services/auth';

/**
 * What a struggle or a marked word can be about (ADR-0026): the rule cards of the path in
 * their order, then madd and the letters' articulation. The api keeps the same list
 * (apps/api/src/rules/repository.ts).
 */
export const TOPICS: readonly RuleTopic[] = [
  ...([2, 3, 4] as const satisfies readonly CardUnit[]).flatMap((u) => UNIT_CARDS[u]),
  'madd',
  'makhraj',
];

/** A topic's name: the rule card's (Arabic in the Arabic interface), or madd or makhārij. */
export function topicName(topic: RuleTopic, m: Messages, language: Language): string {
  if (topic === 'madd' || topic === 'makhraj') return m.struggles.topics[topic];
  return cardName(topic, language);
}

/**
 * The topics a word of the pack carries, in reading order: what a mark on it is most likely
 * about. The pack names rules as its source does (`qalqalah`, `madd_2`, ADR-0008); the rules of
 * the sheet map to their card, every madd to madd. Followers (the letter that decides a rule)
 * are not the rule's place, and silent letters are no topic.
 */
export function wordTopics(word: PackWord): RuleTopic[] {
  const topics: RuleTopic[] = [];
  for (const span of word.r ?? []) {
    const id = span[2];
    if (span[3] === 'f' || !isPackRuleId(id)) continue;
    const rule = PACK_RULES[id].rule;
    const topic = rule ? cardOfRule(rule) : id.startsWith('madd') ? 'madd' : undefined;
    if (topic && !topics.includes(topic)) topics.push(topic);
  }
  return topics;
}
