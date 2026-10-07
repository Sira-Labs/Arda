import { useState } from 'react';
import { qalqalaRound, type Random } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { RuleQuiz } from './RuleQuiz';

/** Unit 4: all 28 letters, one after another: does it bounce back with sukūn (quṭbu jadd)? */
export function QalqalaLetters({ random = Math.random }: { random?: Random }) {
  const { m } = useI18n();
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState(() => qalqalaRound(random));
  return (
    <RuleQuiz
      activity="qalqala-letters"
      key={round}
      questions={questions}
      eyebrow={m.games.eyebrow(4)}
      title={m.games.qalqala.title}
      again={() => {
        setQuestions(qalqalaRound(random));
        setRound(round + 1);
      }}
    />
  );
}
