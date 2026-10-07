import { useState } from 'react';
import { sortRound, type Random } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { useReview } from '@/review/ReviewProvider';
import { RuleQuiz, SORT_GAME } from './RuleQuiz';

/** "Sort the 28" (F6): every letter to its rule against the clock; the best time is kept. */
export function SortLetters({
  random = Math.random,
  clock = Date.now,
}: {
  random?: Random;
  clock?: () => number;
}) {
  const { m } = useI18n();
  const review = useReview();
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState(() => sortRound(random));
  return (
    <RuleQuiz
      activity="sort-28"
      key={round}
      timed
      clock={clock}
      questions={questions}
      eyebrow={m.games.eyebrow(2)}
      title={m.games.sort.title}
      onDone={(result) => {
        if (result.ms !== undefined) review.offerTime(SORT_GAME, result.ms);
      }}
      again={() => {
        setQuestions(sortRound(random));
        setRound(round + 1);
      }}
    />
  );
}
