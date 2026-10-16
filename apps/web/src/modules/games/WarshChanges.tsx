import { useState } from 'react';
import { changeRound, type Random } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { RuleQuiz } from './RuleQuiz';

/** Unit 8, "What does Warsh change?": ten Ḥafṣ words, the place marked; which change is it? */
export function WarshChanges({ random = Math.random }: { random?: Random }) {
  const { m } = useI18n();
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState(() => changeRound(random));
  return (
    <RuleQuiz
      activity="warsh-changes"
      key={round}
      questions={questions}
      eyebrow={m.games.eyebrow(8)}
      title={m.games.warshChanges.title}
      again={() => {
        setQuestions(changeRound(random));
        setRound(round + 1);
      }}
    />
  );
}
