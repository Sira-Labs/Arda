/** What Today shows (ADR-0023): XP, level, streak and the day's quests from the log, as of `now`. */
import type { ActivityEvent } from './activity.js';
import { dayKey } from './day.js';
import { levelFor, type Level } from './levels.js';
import { questsFor, questXpByDay, type Quest } from './quests.js';
import { computeStreak, type Streak } from './streak.js';
import { totalXp, xpAwards } from './xp.js';

export interface EngagementSummary {
  /** Everything earned: rounds, rule cards and the bonus of the quests done. */
  totalXp: number;
  /** XP earned today, the bonus of today's quests included. */
  todayXp: number;
  level: Level;
  streak: Streak;
  /** Today's quests with their progress. */
  quests: Quest[];
}

export function summarise(
  events: Iterable<ActivityEvent>,
  now: number,
  timeZone: string
): EngagementSummary {
  const log = [...events];
  const awards = xpAwards(log, timeZone);
  const today = dayKey(now, timeZone);
  const days = new Set(awards.map((a) => dayKey(a.event.at, timeZone)));
  const bonus = questXpByDay(log, timeZone);
  const total = totalXp(awards) + [...bonus.values()].reduce((sum, xp) => sum + xp, 0);
  return {
    totalXp: total,
    todayXp:
      awards
        .filter((a) => dayKey(a.event.at, timeZone) === today)
        .reduce((sum, a) => sum + a.points, 0) + (bonus.get(today) ?? 0),
    level: levelFor(total),
    streak: computeStreak(days, today),
    quests: questsFor(log, today, timeZone),
  };
}
