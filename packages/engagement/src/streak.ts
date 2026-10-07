/**
 * The daily streak with shields (ported from Suffa): a day counts when something was
 * practised on it. Every 7 active days earn a shield (at most 2), which covers a missed day by
 * itself. Today does not break the streak before it is over.
 */
import { addDays } from './day.js';

export const SHIELD_EVERY_DAYS = 7;
export const MAX_SHIELDS = 2;

export interface Streak {
  /** Days in a row up to today (today counts once it is active). */
  current: number;
  longest: number;
  /** Shields ready for the next missed day. */
  shields: number;
  /** Missed days a shield covered. */
  shieldedDays: string[];
  activeToday: boolean;
}

export function computeStreak(activeDays: ReadonlySet<string>, today: string): Streak {
  const sorted = [...activeDays].filter((d) => d <= today).sort();
  const first = sorted[0];
  const streak: Streak = {
    current: 0,
    longest: 0,
    shields: 0,
    shieldedDays: [],
    activeToday: activeDays.has(today),
  };
  if (first === undefined) return streak;
  let sinceShield = 0;
  for (let day = first; day <= today; day = addDays(day, 1)) {
    if (activeDays.has(day)) {
      streak.current++;
      sinceShield++;
      if (sinceShield === SHIELD_EVERY_DAYS) {
        streak.shields = Math.min(MAX_SHIELDS, streak.shields + 1);
        sinceShield = 0;
      }
      streak.longest = Math.max(streak.longest, streak.current);
    } else if (day === today) {
      // Today is not over yet: the streak still stands.
    } else if (streak.shields > 0) {
      streak.shields--;
      streak.shieldedDays.push(day);
    } else {
      streak.current = 0;
      sinceShield = 0;
    }
  }
  return streak;
}
