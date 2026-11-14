/**
 * Badges (ADR-0023 update 2026-11-14): marks for what someone has done, read from the activity
 * log like XP. Each is earned once and for a deed, never by chance and never for a rank among
 * others.
 */
import { passedUnits, ROUND_KINDS, type ActivityEvent } from './activity.js';

export const BADGE_IDS = [
  'first-round',
  'first-card',
  'perfect-round',
  'all-letters',
  'first-unit',
  'all-units',
  'streak-7',
  'streak-30',
  'level-5',
  'level-10',
] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

export const BADGE_RULES = {
  /** A round without a mistake counts from this many questions. */
  perfectRoundQuestions: 10,
  /** Sort the 28: every letter right. */
  letters: 28,
  streakDays: { 'streak-7': 7, 'streak-30': 30 },
  levels: { 'level-5': 5, 'level-10': 10 },
} as const;

export interface Badge {
  id: BadgeId;
  earned: boolean;
}

/** What the badges need besides the log; the caller has it from `summarise`. */
export interface BadgeContext {
  /** The longest streak so far, in days. */
  longestStreak: number;
  level: number;
  /** The units that have a test (the app's path); all of them passed earn `all-units`. */
  units: readonly number[];
}

/** Every badge in its fixed order, earned or not. */
export function badgesFor(
  events: Iterable<ActivityEvent>,
  context: BadgeContext
): Badge[] {
  const log = [...events];
  const rounds = log.filter((e) => ROUND_KINDS.has(e.kind));
  const perfect = (e: ActivityEvent) => e.total > 0 && e.right === e.total;
  const passed = passedUnits(log);
  const earned: Record<BadgeId, boolean> = {
    'first-round': rounds.length > 0,
    'first-card': log.some((e) => e.kind === 'rule-card'),
    'perfect-round': rounds.some(
      (e) => perfect(e) && e.total >= BADGE_RULES.perfectRoundQuestions
    ),
    'all-letters': log.some(
      (e) => e.kind === 'sort-28' && perfect(e) && e.total >= BADGE_RULES.letters
    ),
    'first-unit': passed.size > 0,
    'all-units': context.units.length > 0 && context.units.every((u) => passed.has(u)),
    'streak-7': context.longestStreak >= BADGE_RULES.streakDays['streak-7'],
    'streak-30': context.longestStreak >= BADGE_RULES.streakDays['streak-30'],
    'level-5': context.level >= BADGE_RULES.levels['level-5'],
    'level-10': context.level >= BADGE_RULES.levels['level-10'],
  };
  return BADGE_IDS.map((id) => ({ id, earned: earned[id] }));
}
