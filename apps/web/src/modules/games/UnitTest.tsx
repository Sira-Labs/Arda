import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { isCardUnit, type CardUnit } from '@/content/units';
import { unitTest, type Random } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { LabUnitTest } from '@/modules/lab/LabQuiz';
import { RuleQuiz } from './RuleQuiz';

/**
 * `/pfad/:unit/test` (ADR-0024): ten questions from the unit; eight right pass it. A pass marks
 * the unit on the path and recommends the next one; nothing is locked. Unit 1's test is heard
 * in the letter lab's words.
 */
export function UnitTest({ random = Math.random }: { random?: Random }) {
  const { unit: param } = useParams();
  if (param === '1') return <LabUnitTest random={random} />;
  return isCardUnit(param) ? (
    <Test key={param} unit={Number(param) as CardUnit} random={random} />
  ) : (
    <Navigate to="/pfad" replace />
  );
}

function Test({ unit, random }: { unit: CardUnit; random: Random }) {
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
