import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { answer, fromMistake, isDue, type NewCard, type ReviewCard } from './leitner';
import {
  LocalReviewStore,
  mergeStates,
  sameState,
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
}

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
    };
  }, [state, record, offerTime, receive, claim, owns, now, clockAt]);

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReview(): Review {
  const review = useContext(ReviewContext);
  if (!review) throw new Error('useReview needs a ReviewProvider');
  return review;
}
