import { useState } from 'react';
import { stopStartRound, type Random } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { RuleQuiz } from './RuleQuiz';

/** Unit 7, "Stop and start": ten real words, each to be stopped on or begun with. */
export function StopAndStart({ random = Math.random }: { random?: Random }) {
  const { m } = useI18n();
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState(() => stopStartRound(random));
  return (
    <RuleQuiz
      activity="stop-and-start"
      key={round}
      questions={questions}
      eyebrow={m.games.eyebrow(7)}
      title={m.games.stopStart.title}
      again={() => {
        setQuestions(stopStartRound(random));
        setRound(round + 1);
      }}
    />
  );
}
