/**
 * Daily quests (ADR-0023 update 2026-11-14): three small goals a day, the same for everyone and
 * every day, read from the activity log. Nothing is drawn by chance and nothing expires into a
 * loss: a quest not done is simply not there the next day.
 */
import { ROUND_KINDS, type ActivityEvent } from './activity.js';
import { dayKey } from './day.js';

export const QUEST_IDS = ['round', 'right-answers', 'variety'] as const;
export type QuestId = (typeof QUEST_IDS)[number];

export const QUEST_RULES = {
  /** Finished rounds a day for `round`. */
  rounds: 1,
  /** Right answers in rounds a day for `right-answers`. */
  rightAnswers: 20,
  /** Different kinds of practice a day for `variety` (a rule card counts as one). */
  kinds: 2,
  /** XP for each quest done, on top of the round cap. */
  bonus: 10,
} as const;

export interface Quest {
  id: QuestId;
  /** How far the day has come, never more than `goal`. */
  progress: number;
  goal: number;
  done: boolean;
}

const quest = (id: QuestId, reached: number, goal: number): Quest => ({
  id,
  progress: Math.min(reached, goal),
  goal,
  done: reached >= goal,
});

/** The three quests from the events of one day. */
function questsOfDay(events: readonly ActivityEvent[]): Quest[] {
  const rounds = events.filter((e) => ROUND_KINDS.has(e.kind));
  return [
    quest('round', rounds.length, QUEST_RULES.rounds),
    quest(
      'right-answers',
      rounds.reduce((sum, e) => sum + e.right, 0),
      QUEST_RULES.rightAnswers
    ),
    quest('variety', new Set(events.map((e) => e.kind)).size, QUEST_RULES.kinds),
  ];
}

function byDay(
  events: Iterable<ActivityEvent>,
  timeZone: string
): Map<string, ActivityEvent[]> {
  const days = new Map<string, ActivityEvent[]>();
  for (const event of events) {
    const day = dayKey(event.at, timeZone);
    const list = days.get(day);
    if (list) list.push(event);
    else days.set(day, [event]);
  }
  return days;
}

/** The quests of `day` (a `YYYY-MM-DD` key in `timeZone`) with their progress. */
export function questsFor(
  events: Iterable<ActivityEvent>,
  day: string,
  timeZone: string
): Quest[] {
  return questsOfDay(byDay(events, timeZone).get(day) ?? []);
}

/** The bonus XP of the quests done, per day (days without a quest done are left out). */
export function questXpByDay(
  events: Iterable<ActivityEvent>,
  timeZone: string
): Map<string, number> {
  const bonus = new Map<string, number>();
  for (const [day, list] of byDay(events, timeZone)) {
    const done = questsOfDay(list).filter((q) => q.done).length;
    if (done > 0) bonus.set(day, done * QUEST_RULES.bonus);
  }
  return bonus;
}
