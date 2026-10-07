import { useState } from 'react';
import { whichRuleRound, type Random } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { RuleQuiz } from './RuleQuiz';

/** "Which rule?" (F6): ten real words of the sheet; each mistake comes back for review. */
export function WhichRule({ random = Math.random }: { random?: Random }) {
  const { m } = useI18n();
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState(() => whichRuleRound(random));
  return (
    <RuleQuiz
      activity="which-rule"
      key={round}
      questions={questions}
      eyebrow={m.games.eyebrow(2)}
      title={m.games.whichRule.title}
      again={() => {
        setQuestions(whichRuleRound(random));
        setRound(round + 1);
      }}
    />
  );
}
