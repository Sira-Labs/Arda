import { useState } from 'react';
import { maddRound, type Random } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { RuleQuiz } from './RuleQuiz';

/** Unit 5, "How long?": ten real words, one madd letter marked: two, four to five or six counts? */
export function MaddLength({ random = Math.random }: { random?: Random }) {
  const { m } = useI18n();
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState(() => maddRound(random));
  return (
    <RuleQuiz
      activity="madd-length"
      key={round}
      questions={questions}
      eyebrow={m.games.eyebrow(5)}
      title={m.games.maddLength.title}
      again={() => {
        setQuestions(maddRound(random));
        setRound(round + 1);
      }}
    />
  );
}
