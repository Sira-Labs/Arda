import { summarise, type EngagementSummary } from '@arda/engagement';
import { useMemo } from 'react';
import { deviceTimeZone, useReview } from '@/review/ReviewProvider';

/**
 * XP, level and streak from the activity log on this device (ADR-0023), in its time zone.
 * Recomputed when the log changes; `now` is injected in tests.
 */
export function useEngagement(now: () => number = Date.now): EngagementSummary {
  const { deck } = useReview();
  const activity = deck.activity;
  return useMemo(
    () => summarise(Object.values(activity ?? {}), now(), deviceTimeZone()),
    [activity, now]
  );
}
