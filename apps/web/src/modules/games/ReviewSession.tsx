import { useState } from 'react';
import { questionOf, type Question } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { useReview } from '@/review/ReviewProvider';
import { RuleQuiz } from './RuleQuiz';

/**
 * `/pfad/wiederholen`: the cards that are due, oldest first, asked the same way as in the
 * games. The set is fixed when the session starts, so answering does not reshuffle it.
 */
export function ReviewSession() {
  const { m } = useI18n();
  const review = useReview();
  const build = () =>
    review.due
      .map(questionOf)
      .filter((question): question is Question => question !== undefined);
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(build);
  return (
    <RuleQuiz
      key={round}
      questions={questions}
      eyebrow={m.games.eyebrow}
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
