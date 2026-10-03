import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { answer, fromMistake, isDue, type NewCard, type ReviewCard } from './leitner';
import { LocalReviewStore, type ReviewState, type ReviewStore } from './store';

export interface Review {
  cards: readonly ReviewCard[];
  due: readonly ReviewCard[];
  /** Records an answer: a mistake creates or resets a card, a right answer promotes one. */
  record(card: NewCard, correct: boolean): void;
  bestTime(game: string): number | undefined;
  /** Saves the time if it is the best so far; returns whether it was. */
  offerTime(game: string, ms: number): boolean;
}

const ReviewContext = createContext<Review | null>(null);

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

  const update = useCallback(
    (change: (state: ReviewState) => ReviewState) => {
      setState((current) => {
        const next = change(current);
        store.save(next);
        return next;
      });
    },
    [store]
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
    const at = now();
    return {
      cards,
      due: cards.filter((card) => isDue(card, at)).sort((a, b) => a.due - b.due),
      record,
      bestTime: (game) => state.bestTimes[game],
      offerTime,
    };
  }, [state, record, offerTime, now]);

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReview(): Review {
  const review = useContext(ReviewContext);
  if (!review) throw new Error('useReview needs a ReviewProvider');
  return review;
}
