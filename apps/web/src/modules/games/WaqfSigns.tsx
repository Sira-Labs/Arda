import { useState } from 'react';
import { signsRound, type Random } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { RuleQuiz } from './RuleQuiz';

/** Unit 7, "The signs": the seven signs of the Madīna muṣḥaf, what each one asks. */
export function WaqfSigns({ random = Math.random }: { random?: Random }) {
  const { m } = useI18n();
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState(() => signsRound(random));
  return (
    <RuleQuiz
      activity="waqf-signs"
      key={round}
      questions={questions}
      eyebrow={m.games.eyebrow(7)}
      title={m.games.signs.title}
      again={() => {
        setQuestions(signsRound(random));
        setRound(round + 1);
      }}
    />
  );
}
