import { useState } from 'react';
import { hearRound, type Random } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { RuleQuiz } from './RuleQuiz';

/** Unit 8, "Ḥafṣ or Warsh?": ten āyāt by one reciter, each in one of the two riwāyāt. */
export function HafsOrWarsh({ random = Math.random }: { random?: Random }) {
  const { m } = useI18n();
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState(() => hearRound(random));
  return (
    <RuleQuiz
      activity="hafs-or-warsh"
      key={round}
      questions={questions}
      eyebrow={m.games.eyebrow(8)}
      title={m.games.hafsOrWarsh.title}
      again={() => {
        setQuestions(hearRound(random));
        setRound(round + 1);
      }}
    />
  );
}
