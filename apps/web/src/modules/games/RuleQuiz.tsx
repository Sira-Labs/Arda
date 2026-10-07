import type { ActivityKind } from '@arda/engagement';
import { RULES } from '@arda/tajweed';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LearningShell } from '@/components/LearningShell';
import { TajweedText } from '@/components/TajweedText';
import { NO_QALQALA, cardName, type AnswerId } from '@/content/units';
import { optionsOf, type Question } from '@/games/questions';
import type { Language } from '@/i18n/languages';
import type { Messages } from '@/i18n/messages';
import { useI18n } from '@/i18n/I18nProvider';
import { useReview } from '@/review/ReviewProvider';
import { focusSegments, segmentsOf } from '@/tajweed/segments';

export interface QuizResult {
  right: number;
  total: number;
  /** Questions answered wrongly: each is now a review card. */
  missed: number;
  /** Milliseconds from the first question to the last answer (timed quizzes). */
  ms?: number;
  /** XP the round earned (ADR-0023). */
  xp: number;
}

/**
 * One question at a time, four rule cards to choose from, feedback in the learner's words
 * (`gut` / `prüfen`, never "falsch"). Every answer goes to the review deck: a mistake becomes a
 * card (ADR-0021). Timed quizzes (Sort the 28) show the clock and move on after a right answer.
 */
export function RuleQuiz({
  activity,
  questions,
  eyebrow,
  title,
  timed = false,
  clock = Date.now,
  onDone,
  again,
  offerReview = true,
}: {
  /** The game, as the activity log names it (ADR-0023). */
  activity: Extract<
    ActivityKind,
    'which-rule' | 'sort-28' | 'review' | 'which-rule-3' | 'qalqala-letters'
  >;
  questions: readonly Question[];
  eyebrow: string;
  title: string;
  timed?: boolean;
  clock?: () => number;
  onDone?: (result: QuizResult) => void;
  /** Starts a new round; the results screen offers it. */
  again?: () => void;
  /** Whether the results link to the review session (not from inside it). */
  offerReview?: boolean;
}) {
  const { m } = useI18n();
  const review = useReview();
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<AnswerId | null>(null);
  const [right, setRight] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const started = useRef(clock());
  const question = questions[index];

  const finish = (rightCount: number) => {
    const xp = review.logActivity({
      kind: activity,
      ref: '',
      right: rightCount,
      total: questions.length,
    });
    const done: QuizResult = {
      right: rightCount,
      total: questions.length,
      missed: questions.length - rightCount,
      xp,
      ...(timed ? { ms: clock() - started.current } : {}),
    };
    setResult(done);
    onDone?.(done);
  };

  const next = (rightCount: number) => {
    setChosen(null);
    if (index + 1 >= questions.length) finish(rightCount);
    else setIndex(index + 1);
  };

  const choose = (card: AnswerId) => {
    if (!question || chosen) return;
    const correct = card === question.answer;
    const rightCount = right + (correct ? 1 : 0);
    review.record(question, correct);
    setRight(rightCount);
    // Against the clock a right answer moves straight on; a mistake waits to be read.
    if (timed && correct) next(rightCount);
    else setChosen(card);
  };

  const progress = result ? 1 : index / Math.max(1, questions.length);

  return (
    <LearningShell closeTo="/pfad" progress={progress}>
      <div className="stack" style={{ gap: 20 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="eyebrow">{eyebrow}</p>
          {timed && !result && <Clock since={started.current} clock={clock} />}
          {!result && questions.length > 0 && (
            <span className="muted">{m.games.progress(index + 1, questions.length)}</span>
          )}
        </div>
        <h1 className="rule-title">{title}</h1>

        {result ? (
          <Results result={result} again={again} offerReview={offerReview} />
        ) : question ? (
          <QuestionView
            key={question.id}
            question={question}
            chosen={chosen}
            onChoose={choose}
            onNext={() => next(right)}
            last={index + 1 >= questions.length}
          />
        ) : (
          <p className="muted">{m.games.review.none}</p>
        )}
      </div>
    </LearningShell>
  );
}

/** The running time of a timed quiz, in whole seconds. */
function Clock({ since, clock }: { since: number; clock: () => number }) {
  const { m } = useI18n();
  const [now, setNow] = useState(clock());
  useEffect(() => {
    const timer = setInterval(() => setNow(clock()), 250);
    return () => clearInterval(timer);
  }, [clock]);
  return (
    <span className="chip" aria-hidden="true">
      {m.games.seconds(Math.floor((now - since) / 1000))}
    </span>
  );
}

/** One question: the word or letter, the four rule cards, and the feedback once answered. */
function QuestionView({
  question,
  chosen,
  onChoose,
  onNext,
  last,
}: {
  question: Question;
  chosen: AnswerId | null;
  onChoose: (card: AnswerId) => void;
  onNext: () => void;
  last: boolean;
}) {
  const { m, language } = useI18n();
  const answered = chosen !== null;
  const correct = chosen === question.answer;

  return (
    <section className="stack" style={{ gap: 16 }} aria-live="polite">
      <div className="paper stack" style={{ gap: 4, alignItems: 'center' }}>
        {question.kind === 'which-rule' ? (
          <TajweedText
            large
            segments={
              answered
                ? segmentsOf(question.prompt, new Set([question.focus.rule]))
                : focusSegments(question.prompt, question.focus)
            }
          />
        ) : (
          <p className="quran quran-lg" lang="ar" dir="rtl">
            {question.prompt}
          </p>
        )}
        <p className="muted" style={{ textAlign: 'center' }}>
          {question.kind === 'qalqala-letter'
            ? m.games.qalqala.question
            : question.kind === 'sort-letter'
              ? m.games.sort.question
              : question.unit === 3
                ? m.games.unit3.question
                : m.games.whichRule.question}
        </p>
      </div>

      <div className="options" role="group" aria-label={m.games.options}>
        {optionsOf(question).map((card) => (
          <button
            key={card}
            type="button"
            className={optionClass(card, chosen, question.answer)}
            aria-pressed={chosen === card}
            disabled={answered}
            onClick={() => onChoose(card)}
          >
            {answerName(card, language, m)}
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
            {m.games.rightAnswer}: <b>{answerName(question.answer, language, m)}</b> ·{' '}
            <Reason question={question} />
          </p>
          {!correct && <p className="muted">{m.games.toReview}</p>}
          <button type="button" className="btn btn-primary" onClick={onNext} autoFocus>
            {last ? m.games.finish : m.games.next}
          </button>
        </div>
      )}
    </section>
  );
}

/** An answer's name: the rule card's, or "no qalqala". */
function answerName(id: AnswerId, language: Language, m: Messages): string {
  return id === NO_QALQALA ? m.games.qalqala.no : cardName(id, language);
}

/**
 * Why: the letter that follows, and for the four exceptions that it is inside one word; the
 * shadda for the ghunna of unit 3; quṭbu jadd for the qalqala letters.
 */
function Reason({ question }: { question: Question }) {
  const { m } = useI18n();
  if (question.kind === 'qalqala-letter') {
    return (
      <>
        <span className="arabic" lang="ar" dir="rtl">
          {question.prompt}
        </span>{' '}
        {question.answer === NO_QALQALA ? m.games.qalqala.isNot : m.games.qalqala.isOne}
      </>
    );
  }
  if (question.kind === 'which-rule' && question.focus.rule === 'ghunna-mushaddad') {
    return <>{m.games.shadda}</>;
  }
  const letter =
    question.kind === 'which-rule' ? question.focus.follower : question.prompt;
  const exception =
    question.kind === 'which-rule' &&
    question.focus.rule === 'izhar' &&
    question.focus.acrossWords === false &&
    letter !== undefined &&
    !RULES.izhar.letters.includes(letter);
  return (
    <>
      {m.games.follows}{' '}
      <span className="arabic" lang="ar" dir="rtl">
        {letter}
      </span>
      {exception && <> – {m.games.insideWord}</>}
    </>
  );
}

/** After an answer the right card turns green and a wrong choice is marked to check. */
function optionClass(card: AnswerId, chosen: AnswerId | null, answer: AnswerId): string {
  if (chosen === null) return 'btn option';
  if (card === answer) return 'btn option option-right';
  if (card === chosen) return 'btn option option-chosen';
  return 'btn option';
}

/** The end of a round: score, new review cards, and where to go next. */
function Results({
  result,
  again,
  offerReview,
}: {
  result: QuizResult;
  again?: () => void;
  offerReview: boolean;
}) {
  const { m } = useI18n();
  const review = useReview();
  return (
    <section className="card stack" style={{ gap: 12 }} role="status">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{m.games.score(result.right, result.total)}</h2>
        {result.xp > 0 && (
          // Numbers with signs stay left to right inside Arabic text.
          <span className="chip" dir="ltr">
            {m.games.xp(result.xp)}
          </span>
        )}
      </div>
      {result.ms !== undefined && <TimeLine ms={result.ms} />}
      <p>{m.games.newCards(result.missed)}</p>
      {offerReview && review.due.length > 0 && (
        <Link className="btn" to="/pfad/wiederholen">
          {m.games.review.open(review.due.length)}
        </Link>
      )}
      <div className="row">
        {again && (
          <button type="button" className="btn btn-primary" onClick={again}>
            {m.games.again}
          </button>
        )}
        <Link className="btn" to="/pfad">
          {m.games.back}
        </Link>
      </div>
    </section>
  );
}

/** The round's time, and the best time or "new best". */
function TimeLine({ ms }: { ms: number }) {
  const { m } = useI18n();
  const review = useReview();
  const best = review.bestTime(SORT_GAME);
  const seconds = Math.round(ms / 100) / 10;
  return (
    <p>
      <span>{m.games.seconds(seconds)}</span>
      {best !== undefined && best >= ms ? (
        <> · {m.games.sort.newBest}</>
      ) : best !== undefined ? (
        <> · {m.games.sort.best(Math.round(best / 100) / 10)}</>
      ) : null}
    </p>
  );
}

/** The key of Sort the 28's best time in the review store. */
export const SORT_GAME = 'sort-28';
