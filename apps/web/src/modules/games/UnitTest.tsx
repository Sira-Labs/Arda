import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { isCardUnit } from '@/content/units';
import { unitTest, type Random } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { RuleQuiz } from './RuleQuiz';

/**
 * `/pfad/:unit/test` (ADR-0024): ten questions from the unit; eight right pass it. A pass marks
 * the unit on the path and recommends the next one; nothing is locked.
 */
export function UnitTest({ random = Math.random }: { random?: Random }) {
  const { unit: param } = useParams();
  return isCardUnit(param) ? (
    <Test key={param} unit={Number(param) as 2 | 3 | 4} random={random} />
  ) : (
    <Navigate to="/pfad" replace />
  );
}

function Test({ unit, random }: { unit: 2 | 3 | 4; random: Random }) {
  const { m } = useI18n();
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState(() => unitTest(unit, random));
  return (
    <RuleQuiz
      activity="unit-test"
      unitTest={unit}
      key={round}
      questions={questions}
      eyebrow={m.games.eyebrow(unit)}
      title={m.games.test.title}
      again={() => {
        setQuestions(unitTest(unit, random));
        setRound(round + 1);
      }}
    />
  );
}
