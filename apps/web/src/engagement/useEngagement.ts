import {
  badgesFor,
  summarise,
  type Badge,
  type EngagementSummary,
} from '@arda/engagement';
import { useMemo } from 'react';
import { TEST_UNITS } from '@/content/units';
import { deviceTimeZone, useReview } from '@/review/ReviewProvider';

export interface Engagement extends EngagementSummary {
  /** Every badge in its order, earned or not (the path's units decide `all-units`). */
  badges: Badge[];
}

/**
 * XP, level, streak, the day's quests and the badges from the activity log on this device
 * (ADR-0023), in its time zone. Recomputed when the log changes; `now` is injected in tests.
 */
export function useEngagement(now: () => number = Date.now): Engagement {
  const { deck } = useReview();
  const activity = deck.activity;
  return useMemo(() => {
    const events = Object.values(activity ?? {});
    const summary = summarise(events, now(), deviceTimeZone());
    return {
      ...summary,
      badges: badgesFor(events, {
        longestStreak: summary.streak.longest,
        level: summary.level.level,
        units: TEST_UNITS,
      }),
    };
  }, [activity, now]);
}
