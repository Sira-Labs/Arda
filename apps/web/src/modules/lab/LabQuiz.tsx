import { passedUnits } from '@arda/engagement';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LearningShell } from '@/components/LearningShell';
import type { Random } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { testVerdict } from '@/modules/games/testVerdict';
import { Soon } from '@/modules/Soon';
import { useReview } from '@/review/ReviewProvider';
import { PlayIcon } from '../mushaf/PlayerBar';
import { LETTERS, isLabLetter } from './letters';
import { SpeedChoice, Status } from './LetterPage';
import {
  answersOf,
  labRound,
  labUnitTest,
  type LabAnswer,
  type LabQuestion,
} from './quiz';
import type { LabLetterId } from './types';
import { useWordPlayer, type WordPlayer } from './useWordPlayer';
import { WordText } from './WordText';

/** `/labor/:letter/quiz`: the letter's listening quiz, or "not found". */
export function LabQuizPage({ random }: { random?: Random }) {
  const { letter } = useParams();
  if (!isLabLetter(letter)) return <Soon page="notFound" />;
  return <LabQuiz key={letter} letter={letter} random={random} />;
}

/**
 * "Welcher Buchstabe?" (spec F5): ten words, heard and not seen; the learner picks the letter
 * (س ز ص) or, for rāʾ, heavy or light. After each answer the word is shown with its letter
 * marked and the reason, in the games' words (`gut` / `prüfen`, never "falsch").
 */
export function LabQuiz({
  letter,
  random = Math.random,
}: {
  letter: LabLetterId;
  random?: Random;
}) {
  const { m } = useI18n();
  const t = m.lab.quiz[LETTERS[letter].quiz];
  return (
    <ListeningRound
      makeRound={() => labRound(letter, random)}
      eyebrow={`${m.lab.eyebrow} · ${m.lab.letters[letter].name}`}
      title={t.title}
      prompt={() => t.question}
      closeTo={`/labor/${letter}`}
      activity={{ kind: 'lab-quiz', ref: letter }}
      back={
        <Link className="btn" to={`/labor/${letter}`}>
          {m.lab.quiz.back}
        </Link>
      }
    />
  );
}

/** `/pfad/1/test`: unit 1's test, ten words across the whole lab (ADR-0024). */
export function LabUnitTest({ random = Math.random }: { random?: Random }) {
  const { m } = useI18n();
  const review = useReview();
  return (
    <ListeningRound
      makeRound={() => labUnitTest(random)}
      eyebrow={m.games.eyebrow(1)}
      title={m.games.test.title}
      intro={m.lab.unitTest}
      // Each word says which letters it is heard against: "Qāf oder Kāf?".
      prompt={(question) => m.lab.quiz[question.kind].title}
      closeTo="/pfad"
      activity={{ kind: 'unit-test', ref: 'unit-1' }}
      verdict={(right, total) =>
        testVerdict(
          m,
          1,
          right,
          total,
          passedUnits(Object.values(review.deck.activity ?? {}))
        )
      }
      back={
        <Link className="btn" to="/pfad">
          {m.games.back}
        </Link>
      }
    />
  );
}

/** A listening round: words heard one after the other, an answer each, then the score. */
function ListeningRound({
  makeRound,
  eyebrow,
  title,
  intro,
  prompt,
  closeTo,
  activity,
  verdict,
  back,
}: {
  makeRound: () => LabQuestion[];
  eyebrow: string;
  title: string;
  intro?: string;
  prompt: (question: LabQuestion) => string;
  closeTo: string;
  activity: { kind: 'lab-quiz' | 'unit-test'; ref: string };
  /** What the score means, for a unit test. */
  verdict?: (right: number, total: number) => string;
  back: ReactNode;
}) {
  const { m } = useI18n();
  const player = useWordPlayer();
  const [round, setRound] = useState(makeRound);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<LabAnswer | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);
  // XP the finished round earned (ADR-0023).
  const [xp, setXp] = useState(0);
  const review = useReview();
  const question = round[index];

  const choose = (answer: LabAnswer) => {
    if (!question || chosen) return;
    setChosen(answer);
    if (answer === question.answer) setRight(right + 1);
  };
  const next = () => {
    setChosen(null);
    if (index + 1 >= round.length) {
      player.stop();
      setXp(review.logActivity({ ...activity, right, total: round.length }));
      setDone(true);
      return;
    }
    setIndex(index + 1);
    // Straight on to the next word: the tap that moves on lets the browser play it.
    const word = round[index + 1]?.word;
    if (word) player.play(word.key);
  };
  const again = () => {
    setRound(makeRound());
    setIndex(0);
    setChosen(null);
    setRight(0);
    setDone(false);
  };

  return (
    <LearningShell
      closeTo={closeTo}
      progress={done ? 1 : index / Math.max(1, round.length)}
    >
      <div className="stack" style={{ gap: 20 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="eyebrow">{eyebrow}</p>
          {!done && (
            <span className="muted">{m.games.progress(index + 1, round.length)}</span>
          )}
        </div>
        <h1 className="rule-title">{title}</h1>
        {intro && index === 0 && !chosen && !done && <p className="muted">{intro}</p>}

        {done ? (
          <section className="card stack" style={{ gap: 12 }} role="status">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2>{m.games.score(right, round.length)}</h2>
              {xp > 0 && (
                <span className="chip" dir="ltr">
                  {m.games.xp(xp)}
                </span>
              )}
            </div>
            {verdict && (
              <p>
                <strong>{verdict(right, round.length)}</strong>
              </p>
            )}
            <div className="row">
              {/* The quiz's end takes the focus the last answer's button had. */}
              <button type="button" className="btn btn-primary" onClick={again} autoFocus>
                {m.games.again}
              </button>
              {back}
            </div>
          </section>
        ) : question ? (
          <QuestionView
            key={`${index}:${question.word.key}`}
            question={question}
            options={answersOf(question.kind)}
            prompt={prompt(question)}
            chosen={chosen}
            player={player}
            onChoose={choose}
            onNext={next}
            last={index + 1 >= round.length}
            // After an answer the next word's listen button takes the focus.
            focusListen={index > 0}
          />
        ) : null}
      </div>
    </LearningShell>
  );
}

function QuestionView({
  question,
  options,
  prompt,
  chosen,
  player,
  onChoose,
  onNext,
  last,
  focusListen,
}: {
  question: LabQuestion;
  options: readonly LabAnswer[];
  prompt: string;
  chosen: LabAnswer | null;
  player: WordPlayer;
  onChoose: (answer: LabAnswer) => void;
  onNext: () => void;
  last: boolean;
  focusListen: boolean;
}) {
  const { m } = useI18n();
  const answered = chosen !== null;
  const correct = chosen === question.answer;
  const playing = player.playing === question.word.key;
  return (
    <section className="stack" style={{ gap: 16 }} aria-live="polite">
      <div className="paper stack" style={{ gap: 12, alignItems: 'center' }}>
        <p className="muted" style={{ textAlign: 'center' }}>
          {prompt}
        </p>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!player.ready}
          autoFocus={focusListen}
          onClick={() => player.play(question.word.key)}
        >
          <PlayIcon pause={false} />{' '}
          {playing || answered ? m.lab.quiz.listenAgain : m.lab.quiz.listen}
        </button>
        <SpeedChoice />
        <Status player={player} />
        {answered && <WordText word={question.word} className="quran quran-lg" />}
      </div>

      <div className="options lab-options" role="group" aria-label={m.lab.quiz.options}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={optionClass(option, chosen, question.answer)}
            aria-pressed={chosen === option}
            disabled={answered}
            onClick={() => onChoose(option)}
          >
            <AnswerName answer={option} />
          </button>
        ))}
      </div>

      {answered && (
        <div
          className={correct ? 'card answer answer-good' : 'card answer answer-check'}
          role="status"
        >
          <strong>{correct ? m.games.good : m.games.check}</strong>
          <p>
            {m.games.rightAnswer}: <AnswerName answer={question.answer} /> ·{' '}
            {m.lab.quiz.why[question.answer]}
          </p>
          <button type="button" className="btn btn-primary" onClick={onNext} autoFocus>
            {last ? m.games.finish : m.games.next}
          </button>
        </div>
      )}
    </section>
  );
}

/** A letter as the letter and its name; a weight in words. */
function AnswerName({ answer }: { answer: LabAnswer }) {
  const { m } = useI18n();
  if (answer === 'heavy' || answer === 'light')
    return <b>{m.lab.quiz.weights[answer]}</b>;
  return (
    <>
      <b className="arabic" lang="ar" dir="rtl">
        {LETTERS[answer].letter}
      </b>{' '}
      {m.lab.letters[answer].name}
    </>
  );
}

/** After an answer the right one turns green and a wrong choice is marked to check. */
function optionClass(option: LabAnswer, chosen: LabAnswer | null, answer: LabAnswer) {
  if (chosen === null) return 'btn option';
  if (option === answer) return 'btn option option-right';
  if (option === chosen) return 'btn option option-chosen';
  return 'btn option';
}
