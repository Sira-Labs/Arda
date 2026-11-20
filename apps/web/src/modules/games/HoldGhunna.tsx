import { useCallback, useEffect, useRef, useState } from 'react';
import { LearningShell } from '@/components/LearningShell';
import { TajweedText } from '@/components/TajweedText';
import { createBeatSound, type BeatSound } from '@/games/beat';
import {
  countsHeld,
  GHUNNA_COUNTS,
  holdRound,
  TEMPI,
  tempoOf,
  verdictOf,
  type HoldVerdict,
} from '@/games/hold';
import type { Random, WordQuestion } from '@/games/questions';
import { useI18n } from '@/i18n/I18nProvider';
import { useReview } from '@/review/ReviewProvider';
import { segmentsOf } from '@/tajweed/segments';
import { Results, type QuizResult } from './RuleQuiz';

/** Beats in one bar of the practice beat: the first is marked, by eye and by ear. */
const BAR = 4;

interface Outcome {
  verdict: HoldVerdict;
  counts: number;
}

/**
 * "Halte die Ghunna" (spec F6, unit 3): a word with nūn or mīm mushaddad, a beat, and a
 * button held while the learner hums the ghunna: two counts, not one, not three. Nothing is
 * recorded and the microphone is not used; the learner hums for themselves and the button
 * measures how long. A hold that was too short or too long puts the word into the review.
 *
 * @param clock milliseconds, monotonic; injected in tests
 * @param sound the click of the beat; `undefined` makes one when the round starts, `null` is silent
 */
export function HoldGhunna({
  random = Math.random,
  clock = () => performance.now(),
  sound,
}: {
  random?: Random;
  clock?: () => number;
  sound?: BeatSound | null;
}) {
  const { m, language } = useI18n();
  const t = m.games.hold;
  const review = useReview();
  const [words, setWords] = useState<WordQuestion[]>(() => holdRound(random));
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const [beat, setBeat] = useState(0);
  const [holding, setHolding] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [audible, setAudible] = useState(true);
  // For those who cannot keep a button down: one tap starts the hold, the next ends it.
  const [taps, setTaps] = useState(false);
  // The words missed this round: a word missed twice is still one card in the review.
  const missed = useRef(new Set<string>());
  const downAt = useRef<number | null>(null);
  const click = useRef<BeatSound | null>(null);

  const word = words[index];
  const tempo = tempoOf(index, words.length);
  const beatMs = TEMPI[tempo];
  const running = started && !result && !outcome && word !== undefined;

  // Whether the beat is heard is read at each beat: muting must not start the bar anew.
  const heard = useRef(audible);
  heard.current = audible;

  // The beat runs while a try is open; it starts anew with each try and each tempo.
  useEffect(() => {
    if (!running) return;
    let at = 0;
    const strike = () => {
      setBeat(at);
      if (heard.current) click.current?.tick(at === 0);
      at = (at + 1) % BAR;
    };
    strike();
    const timer = setInterval(strike, beatMs);
    return () => clearInterval(timer);
  }, [running, beatMs, index]);

  useEffect(
    () => () => {
      click.current?.close();
      click.current = null;
    },
    []
  );

  const start = () => {
    // Made on this tap: browsers let a page make sound only from one.
    click.current = sound === undefined ? createBeatSound() : sound;
    setStarted(true);
  };

  const press = useCallback(() => {
    if (!running || downAt.current !== null) return;
    downAt.current = clock();
    setHolding(true);
  }, [running, clock]);

  const release = useCallback(() => {
    const since = downAt.current;
    if (since === null || !word) return;
    downAt.current = null;
    setHolding(false);
    const counts = countsHeld(clock() - since, beatMs);
    const verdict = verdictOf(counts);
    if (verdict === 'good') setRight((n) => n + 1);
    // The word comes back in the review, asked for its rule.
    else {
      review.record(word, false);
      missed.current.add(word.id);
    }
    setOutcome({ verdict, counts });
  }, [word, clock, beatMs, review]);

  const next = () => {
    setOutcome(null);
    if (index + 1 < words.length) return setIndex(index + 1);
    const xp = review.logActivity({
      kind: 'hold-ghunna',
      ref: '',
      right,
      total: words.length,
    });
    setResult({ right, total: words.length, missed: missed.current.size, xp });
  };

  const again = () => {
    missed.current = new Set();
    setWords(holdRound(random));
    setIndex(0);
    setRight(0);
    setOutcome(null);
    setResult(null);
  };

  const progress = result ? 1 : index / Math.max(1, words.length);
  const rounded = (counts: number) =>
    (Math.round(counts * 10) / 10).toLocaleString(language === 'ar' ? 'ar-EG' : language);

  return (
    <LearningShell closeTo="/pfad" progress={progress}>
      <div className="stack" style={{ gap: 20 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="eyebrow">{m.games.eyebrow(3)}</p>
          {started && !result && (
            <span className="muted">{m.games.progress(index + 1, words.length)}</span>
          )}
        </div>
        <h1 className="rule-title">{t.title}</h1>

        {result ? (
          <Results result={result} again={again} offerReview />
        ) : !started ? (
          <section className="card stack" style={{ gap: 12 }}>
            <p>{t.how}</p>
            <p className="muted">{t.noMicrophone}</p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start' }}
              onClick={start}
            >
              {t.start}
            </button>
          </section>
        ) : word ? (
          <section className="stack" style={{ gap: 16 }}>
            <div className="paper stack" style={{ gap: 4, alignItems: 'center' }}>
              <TajweedText
                large
                segments={segmentsOf(word.prompt, new Set([word.focus.rule]))}
              />
              <p className="muted" style={{ textAlign: 'center' }}>
                {t.question}
              </p>
            </div>

            <p className="muted" role="status" style={{ textAlign: 'center' }}>
              {t.tempo[tempo]}
            </p>
            {/* The beat is heard, or seen here; a screen reader is not told every beat. */}
            <div className="beat" aria-hidden="true">
              {Array.from({ length: BAR }, (_, n) => (
                <span
                  key={n}
                  className="beat-dot"
                  data-on={running && n === beat ? '' : undefined}
                  data-first={n === 0 ? '' : undefined}
                />
              ))}
            </div>

            {taps ? (
              <button
                type="button"
                className="btn btn-primary hold-button"
                aria-pressed={holding}
                disabled={!running}
                onClick={() => (holding ? release() : press())}
              >
                {holding ? t.tapEnd : t.tapStart}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary hold-button"
                data-holding={holding ? '' : undefined}
                disabled={!running}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  press();
                }}
                onPointerUp={release}
                onPointerCancel={release}
                onKeyDown={(event) => {
                  if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
                    event.preventDefault();
                    press();
                  }
                }}
                onKeyUp={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') release();
                }}
                onBlur={release}
                onContextMenu={(event) => event.preventDefault()}
              >
                {holding ? t.holding : t.hold}
              </button>
            )}

            <div className="row" style={{ gap: 16, justifyContent: 'center' }}>
              <label className="row" style={{ gap: 6 }}>
                <input
                  type="checkbox"
                  checked={audible}
                  onChange={(event) => setAudible(event.target.checked)}
                />
                <span>{t.sound}</span>
              </label>
              <label className="row" style={{ gap: 6 }}>
                <input
                  type="checkbox"
                  checked={taps}
                  disabled={holding}
                  onChange={(event) => setTaps(event.target.checked)}
                />
                <span>{t.taps}</span>
              </label>
            </div>

            {outcome && (
              <div
                className={
                  outcome.verdict === 'good'
                    ? 'card answer answer-good'
                    : 'card answer answer-check'
                }
                role="status"
              >
                <strong>
                  {outcome.verdict === 'good' ? m.games.good : m.games.check}
                </strong>
                <p>
                  {t.verdict[outcome.verdict]} {t.held(rounded(outcome.counts))}
                </p>
                <HoldMeter counts={outcome.counts} />
                {outcome.verdict !== 'good' && (
                  <p className="muted">{m.games.toReview}</p>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={next}
                  autoFocus
                >
                  {index + 1 >= words.length ? m.games.finish : m.games.next}
                </button>
              </div>
            )}
          </section>
        ) : (
          <p className="muted">{m.games.review.none}</p>
        )}
      </div>
    </LearningShell>
  );
}

/**
 * Where the hold ended on a line of three counts, the second marked as the goal. A picture
 * of the sentence above it, which says the same in words.
 */
function HoldMeter({ counts }: { counts: number }) {
  const SHOWN = GHUNNA_COUNTS + 1;
  const at = Math.min(SHOWN + 0.5, Math.max(0, counts)) / (SHOWN + 0.5);
  return (
    <div className="hold-meter" aria-hidden="true">
      <span className="hold-meter-goal" />
      <span className="hold-meter-mark" style={{ insetInlineStart: `${at * 100}%` }} />
      <span className="hold-meter-scale">
        {Array.from({ length: SHOWN }, (_, n) => (
          <span key={n}>{n + 1}</span>
        ))}
      </span>
    </div>
  );
}
