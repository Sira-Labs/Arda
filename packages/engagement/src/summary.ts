/** What Today shows (ADR-0023): XP, level and streak from the log, as of `now`. */
import type { ActivityEvent } from './activity.js';
import { dayKey } from './day.js';
import { levelFor, type Level } from './levels.js';
import { computeStreak, type Streak } from './streak.js';
import { totalXp, xpAwards } from './xp.js';

export interface EngagementSummary {
  totalXp: number;
  /** XP earned today. */
  todayXp: number;
  level: Level;
  streak: Streak;
}

export function summarise(
  events: Iterable<ActivityEvent>,
  now: number,
  timeZone: string
): EngagementSummary {
  const awards = xpAwards(events, timeZone);
  const today = dayKey(now, timeZone);
  const days = new Set(awards.map((a) => dayKey(a.event.at, timeZone)));
  const total = totalXp(awards);
  return {
    totalXp: total,
    todayXp: awards
      .filter((a) => dayKey(a.event.at, timeZone) === today)
      .reduce((sum, a) => sum + a.points, 0),
    level: levelFor(total),
    streak: computeStreak(days, today),
  };
}
