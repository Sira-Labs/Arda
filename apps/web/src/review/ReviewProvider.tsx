import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { xpAwards, type ActivityEvent } from '@arda/engagement';
import { answer, fromMistake, isDue, type NewCard, type ReviewCard } from './leitner';
import {
  LocalReviewStore,
  mergeStates,
  sameState,
  type ReadingScript,
  type ReviewState,
  type ReviewStore,
} from './store';

export interface Review {
  cards: readonly ReviewCard[];
  due: readonly ReviewCard[];
  /** Records an answer: a mistake creates or resets a card, a right answer promotes one. */
  record(card: NewCard, correct: boolean): void;
  bestTime(game: string): number | undefined;
  /** Saves the time if it is the best so far; returns whether it was. */
  offerTime(game: string, ms: number): boolean;
  /** The whole deck, as the account sync sends it (ADR-0022). */
  deck: ReviewState;
  /**
   * Takes in `userId`'s deck from the account, merged into this one; dropped when the deck on
   * the device has meanwhile been handed to another account (in another tab).
   */
  receive(incoming: ReviewState, userId: string): void;
  /** Binds the deck to the account signing in; true when another account's deck was dropped. */
  claim(userId: string): boolean;
  /** Is the deck on this device `userId`'s now (another tab may have handed it on)? */
  owns(userId: string): boolean;
  /**
   * Adds a finished round or a rule card read to its end to the activity log (ADR-0023);
   * returns the XP it earned.
   */
  logActivity(entry: ActivityEntry): number;
  /** The page last read per muṣḥaf script, on this device or (synced) another. */
  places: NonNullable<ReviewState['places']>;
  /** Remembers the page being read in a script ("Weiterlesen"). */
  markPlace(script: ReadingScript, page: number): void;
}

/** What a screen reports; the provider adds the id and the time. */
export type ActivityEntry = Pick<ActivityEvent, 'kind' | 'ref' | 'right' | 'total'>;

/** The device's time zone: days and the streak follow local midnight. */
export const deviceTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

const ReviewContext = createContext<Review | null>(null);

/** How often the due list is recomputed while nothing else changes. */
export const DUE_REFRESH_MS = 60_000;

/** The review deck for the app (ADR-0021); store and clock are injected in tests. */
export function ReviewProvider({
  children,
  store: injected,
  now = Date.now,
}: {
  children: ReactNode;
  store?: ReviewStore;
  now?: () => number;
}) {
  const [store] = useState<ReviewStore>(() => injected ?? new LocalReviewStore());
  const [state, setState] = useState<ReviewState>(() => store.load());
  // Cards fall due while the app stays open: the clock is read again once a minute.
  const [clockAt, setClockAt] = useState(now);
  useEffect(() => {
    const timer = setInterval(() => setClockAt(now()), DUE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [now]);

  const update = useCallback(
    (change: (state: ReviewState) => ReviewState) => {
      setState((current) => {
        const next = change(current);
        // What the store holds now, including what another tab saved meanwhile.
        return next === current ? current : store.save(next);
      });
    },
    [store]
  );

  // Another tab practised: take its cards and times into this one.
  useEffect(
    () =>
      store.subscribe?.((incoming, replaced) =>
        // Handed to another account there: this tab's copy is dropped, not merged.
        setState((current) => (replaced ? incoming : mergeStates(current, incoming)))
      ),
    [store]
  );

  const claim = useCallback(
    (userId: string) => {
      const { state: held, replaced } = store.claim(userId);
      if (replaced) setState(held);
      return replaced;
    },
    [store]
  );
  const owns = useCallback((userId: string) => store.owner() === userId, [store]);

  const receive = useCallback(
    (incoming: ReviewState, userId: string) => {
      // Unchanged by the merge: no save, no new deck, so no new sync is triggered.
      update((current) => {
        // An answer that was on its way while another tab signed someone else in.
        if (store.owner() !== userId) return current;
        const merged = mergeStates(current, incoming);
        return sameState(merged, current) ? current : merged;
      });
    },
    [store, update]
  );

  // The log including events logged since the last render, so two events before it are
  // each awarded against the other (the daily cap, a rule card's XP once).
  const pendingActivity = useRef(state.activity);
  useEffect(() => {
    pendingActivity.current = state.activity;
  }, [state.activity]);

  const logActivity = useCallback(
    (entry: ActivityEntry) => {
      const event: ActivityEvent = { id: crypto.randomUUID(), at: now(), ...entry };
      const activity = { ...pendingActivity.current, [event.id]: event };
      pendingActivity.current = activity;
      const earned = xpAwards(Object.values(activity), deviceTimeZone()).find(
        (a) => a.event.id === event.id
      );
      update((current) => ({
        ...current,
        activity: { ...current.activity, [event.id]: event },
      }));
      return earned?.points ?? 0;
    },
    [update, now]
  );

  const record = useCallback(
    (card: NewCard, correct: boolean) => {
      update((current) => {
        const existing = current.cards[card.id];
        // A right answer on something never missed needs no card.
        if (!existing && correct) return current;
        const at = now();
        const next = existing ? answer(existing, correct, at) : fromMistake(card, at);
        return { ...current, cards: { ...current.cards, [card.id]: next } };
      });
    },
    [update, now]
  );

  const markPlace = useCallback(
    (script: ReadingScript, page: number) => {
      update((current) =>
        current.places?.[script]?.page === page
          ? current
          : { ...current, places: { ...current.places, [script]: { page, at: now() } } }
      );
    },
    [update, now]
  );

  const offerTime = useCallback(
    (game: string, ms: number) => {
      const best = state.bestTimes[game];
      if (best !== undefined && best <= ms) return false;
      update((current) => ({
        ...current,
        bestTimes: { ...current.bestTimes, [game]: ms },
      }));
      return true;
    },
    [state.bestTimes, update]
  );

  const value = useMemo<Review>(() => {
    const cards = Object.values(state.cards);
    const at = Math.max(clockAt, now());
    return {
      cards,
      due: cards.filter((card) => isDue(card, at)).sort((a, b) => a.due - b.due),
      record,
      bestTime: (game) => state.bestTimes[game],
      offerTime,
      deck: state,
      receive,
      claim,
      owns,
      logActivity,
      places: state.places ?? {},
      markPlace,
    };
  }, [
    state,
    record,
    offerTime,
    receive,
    claim,
    owns,
    logActivity,
    markPlace,
    now,
    clockAt,
  ]);

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReview(): Review {
  const review = useContext(ReviewContext);
  if (!review) throw new Error('useReview needs a ReviewProvider');
  return review;
}
