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
  const [questions] = useState<Question[]>(() =>
    review.due
      .map(questionOf)
      .filter((question): question is Question => question !== undefined)
  );
  return (
    <RuleQuiz
      questions={questions}
      eyebrow={m.games.eyebrow}
      title={m.games.review.title}
    />
  );
}
