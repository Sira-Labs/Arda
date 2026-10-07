/**
 * Keeps the review deck in step with the account (ADR-0022). Signed out, the deck stays on the
 * device. Signed in, the device sends its deck and merges the account's answer into it: after
 * sign-in, a few seconds after a change (one request per game, not per answer), when the
 * device comes back online and when the app is shown again. Both sides merge per card by time,
 * so a lost answer or a retry never loses progress, and no outbox is needed.
 *
 * The store remembers whose deck it holds (`claim`). A guest's deck joins the first account that
 * signs in; another account's deck is dropped, not merged, so progress never moves between
 * people, also not through a second tab still showing the previous account (`owns`).
 */
import { useEffect, useRef } from 'react';
import type { AuthClient, ProgressPayload } from '@/services/auth';
import { logger } from '@/services/logger';
import type { Review } from './ReviewProvider';
import { emptyState, parseState, sameState, type ReviewState } from './store';

const log = logger.child('progress-sync');

/** How long after a change the deck is sent: the rest of a game's answers go along. */
export const SYNC_DELAY_MS = 3000;

const toPayload = (deck: ReviewState): ProgressPayload => ({
  cards: Object.values(deck.cards),
  bestTimes: deck.bestTimes,
});

/** The account's deck from the answer, damaged entries dropped like a stored deck's. */
function fromPayload(payload: ProgressPayload): ReviewState | undefined {
  if (!Array.isArray(payload?.cards)) return undefined;
  const cards = Object.fromEntries(
    payload.cards.map((card) => [(card as { id?: unknown })?.id, card])
  );
  return parseState({ cards, bestTimes: payload.bestTimes });
}

export function useProgressSync(
  client: AuthClient,
  review: Pick<Review, 'deck' | 'receive' | 'claim' | 'owns'>,
  userId: string | null
) {
  // The latest deck and receiver, read by the timers without restarting them.
  const latest = useRef(review);
  latest.current = review;
  // What the account held after the last sync: an equal deck is not sent again.
  const synced = useRef<ReviewState | null>(null);
  // Sends the deck after a short pause; set while an account is signed in.
  const schedule = useRef<(() => void) | null>(null);

  useEffect(() => {
    synced.current = null;
    if (!userId) return;
    // Whose deck: another account's is dropped before anything is sent.
    let dropped = latest.current.claim(userId);
    if (dropped)
      log.info("another account signed in: the previous account's deck was dropped");

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running: Promise<void> | null = null;
    let again = false;

    const syncOnce = async () => {
      // Another tab signed a different account in: this tab's deck and session are stale.
      if (!latest.current.owns(userId)) {
        log.info('progress sync skipped: the deck belongs to another account now');
        return;
      }
      // Until the replaced deck has rendered, the deck at hand is still the other account's.
      const deck = dropped ? emptyState() : latest.current.deck;
      dropped = false;
      const result = await client.syncProgress(toPayload(deck));
      if (stopped) return;
      if (!result.ok) {
        // Offline waits for the `online` event; anything else is tried at the next change.
        if (result.code !== 'offline') {
          log.warn('progress sync failed', { status: result.status, code: result.code });
        }
        return;
      }
      const incoming = fromPayload(result.value);
      if (!incoming) {
        log.warn('progress sync: unknown answer');
        return;
      }
      synced.current = incoming;
      latest.current.receive(incoming, userId);
    };

    const sync = () => {
      clearTimeout(timer);
      timer = undefined;
      // One request at a time; a change meanwhile is sent right after it.
      if (running) {
        again = true;
        return;
      }
      running = syncOnce().finally(() => {
        running = null;
        if (again && !stopped) {
          again = false;
          sync();
        }
      });
    };

    const onVisibility = () => {
      // Shown again: fetch what other devices did. Hidden: send what waits, the app may close.
      if (document.visibilityState === 'visible' || timer !== undefined) sync();
    };
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', onVisibility);
    schedule.current = () => {
      clearTimeout(timer);
      timer = setTimeout(sync, SYNC_DELAY_MS);
    };
    sync();
    return () => {
      stopped = true;
      clearTimeout(timer);
      schedule.current = null;
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [client, userId]);

  // A change to the deck (an answer, a best time) is sent after a short pause.
  const deck = review.deck;
  const seen = useRef(deck);
  useEffect(() => {
    if (deck === seen.current) return;
    seen.current = deck;
    // The account's own answer coming back is no change to send.
    if (synced.current && sameState(deck, synced.current)) return;
    schedule.current?.();
  }, [deck]);
}
