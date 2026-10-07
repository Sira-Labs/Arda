/**
 * XP rules v1 (ADR-0023, after Suffa's ADR-0016): pure functions of the activity log, so every
 * device computes the same numbers, offline and at once. XP rewards finished rounds and right
 * answers, not volume: round XP is capped per day.
 */
import { ROUND_KINDS, type ActivityEvent } from './activity.js';
import { dayKey } from './day.js';

/** Bump when a weight changes. */
export const RULES_VERSION = 1;

export const XP_RULES = {
  /** Per right answer in a round. */
  rightAnswer: 2,
  /** For finishing a round. */
  roundFinished: 5,
  /** A round without a mistake. */
  perfectRound: 5,
  /** Cap on round XP per local day. */
  roundDailyCap: 200,
  /** A rule card read to its end, once per card. */
  ruleCard: 20,
} as const;

/** The XP one event earned. */
export interface XpAward {
  event: ActivityEvent;
  points: number;
}

/** Events by time, ties by id, so every device orders them alike. */
export function byTime(events: Iterable<ActivityEvent>): ActivityEvent[] {
  return [...events].sort(
    (a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

/** The XP of a round before the daily cap. */
export function roundXp(right: number, total: number): number {
  return (
    right * XP_RULES.rightAnswer +
    XP_RULES.roundFinished +
    (total > 0 && right === total ? XP_RULES.perfectRound : 0)
  );
}

/** Every event with the XP it earned (days in `timeZone`). */
export function xpAwards(events: Iterable<ActivityEvent>, timeZone: string): XpAward[] {
  const cards = new Set<string>();
  const perDay = new Map<string, number>();
  return byTime(events).map((event) => {
    if (event.kind === 'rule-card') {
      const first = !cards.has(event.ref);
      cards.add(event.ref);
      return { event, points: first ? XP_RULES.ruleCard : 0 };
    }
    if (!ROUND_KINDS.has(event.kind)) return { event, points: 0 };
    const day = dayKey(event.at, timeZone);
    const soFar = perDay.get(day) ?? 0;
    const points = Math.max(
      0,
      Math.min(roundXp(event.right, event.total), XP_RULES.roundDailyCap - soFar)
    );
    perDay.set(day, soFar + points);
    return { event, points };
  });
}

export function totalXp(awards: readonly XpAward[]): number {
  return awards.reduce((sum, award) => sum + award.points, 0);
}
