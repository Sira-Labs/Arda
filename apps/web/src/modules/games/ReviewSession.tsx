import { useEffect, useState } from 'react';
import { questionOf, type Question } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { useReview } from '@/review/ReviewProvider';
import type { ReviewCard } from '@/review/leitner';
import { RuleQuiz } from './RuleQuiz';

/** The questions of the due cards whose content still exists. */
const questionsOf = (due: readonly ReviewCard[]): Question[] =>
  due.map(questionOf).filter((question): question is Question => question !== undefined);

/**
 * `/pfad/wiederholen`: the cards that are due, oldest first, asked the same way as in the
 * games. The set is fixed when the session starts, so answering does not reshuffle it.
 */
export function ReviewSession() {
  const { m } = useI18n();
  const review = useReview();
  const build = () => questionsOf(review.due);
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(build);

  // Opened with nothing due, the session starts as soon as a card falls due; a round in
  // progress keeps its questions.
  useEffect(() => {
    if (questions.length === 0 && review.due.length > 0) {
      setQuestions(questionsOf(review.due));
      setRound((value) => value + 1);
    }
  }, [questions.length, review.due]);
  return (
    <RuleQuiz
      activity="review"
      key={round}
      questions={questions}
      eyebrow={m.games.practise}
      title={m.games.review.title}
      offerReview={false}
      // "Again" asks what is due now: the cards just missed, not the ones just learnt.
      again={() => {
        setQuestions(build());
        setRound(round + 1);
      }}
    />
  );
}
