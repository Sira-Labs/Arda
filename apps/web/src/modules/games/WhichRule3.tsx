import { useState } from 'react';
import { unit3Round, type Random } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { RuleQuiz } from './RuleQuiz';

/** "Which rule?" of unit 3: the ghunna of a shadda and the three mīm sākina rules. */
export function WhichRule3({ random = Math.random }: { random?: Random }) {
  const { m } = useI18n();
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState(() => unit3Round(random));
  return (
    <RuleQuiz
      activity="which-rule-3"
      key={round}
      questions={questions}
      eyebrow={m.games.eyebrow(3)}
      title={m.games.unit3.title}
      again={() => {
        setQuestions(unit3Round(random));
        setRound(round + 1);
      }}
    />
  );
}
