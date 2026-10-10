import { useState } from 'react';
import { weightRound, type Random } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { RuleQuiz } from './RuleQuiz';

/** Unit 6, "Heavy or light?": ten real words, a rāʾ or the lām of Allāh marked. */
export function HeavyOrLight({ random = Math.random }: { random?: Random }) {
  const { m } = useI18n();
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState(() => weightRound(random));
  return (
    <RuleQuiz
      activity="heavy-or-light"
      key={round}
      questions={questions}
      eyebrow={m.games.eyebrow(6)}
      title={m.games.weight.title}
      again={() => {
        setQuestions(weightRound(random));
        setRound(round + 1);
      }}
    />
  );
}
