import { Link, useParams } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { Soon } from '@/modules/Soon';
import { PlayIcon } from '../mushaf/PlayerBar';
import { SPEEDS, chooseSpeed, useSpeed } from '../mushaf/reciters';
import { HeadDiagram } from './HeadDiagram';
import { DraftBadge } from './Lab';
import { LETTERS, isLabLetter } from './letters';
import type { LabLetterId, LabPair, LabWord } from './types';
import { useWordPlayer, type WordPlayer } from './useWordPlayer';
import { WordText, whereOf } from './WordText';
import { LAB_PAIRS, LAB_WORDS } from './words';

/** `/labor/:letter`: a letter of the lab, or "not found" for anything else. */
export function LetterPage() {
  const { letter } = useParams();
  if (!isLabLetter(letter)) return <Soon page="notFound" />;
  return <Letter key={letter} id={letter} />;
}

/**
 * A letter of the lab (spec F5): the letter, its point on the head, its makhraj in plain
 * words, its ṣifāt, the mistakes a German speaker makes, and the exercises – hear real words
 * and repeat them, the listening quiz, pairs to compare, and (soon) recording oneself.
 */
export function Letter({ id }: { id: LabLetterId }) {
  const { m } = useI18n();
  const t = m.lab;
  const letter = LETTERS[id];
  const texts = t.letters[id];
  const player = useWordPlayer();
  const words = LAB_WORDS.filter((w) => w.letter === id);
  const pairs = LAB_PAIRS.filter((p) => p.letters.includes(id));
  const quiz = t.quiz[letter.quiz];

  return (
    <article
      className="stack"
      style={{ gap: 24, maxWidth: 720 }}
      aria-labelledby="lab-letter"
    >
      <Link to="/labor" className="muted">
        ← {t.back}
      </Link>
      <header
        className="stack"
        style={{ gap: 4, alignItems: 'center', textAlign: 'center' }}
      >
        <p className="eyebrow">{t.eyebrow}</p>
        <p className="quran lab-letter lab-letter-hero" lang="ar" dir="rtl">
          {letter.letter}
        </p>
        <h1 id="lab-letter" className="rule-title">
          {texts.name}{' '}
          <span className="arabic" lang="ar" dir="rtl">
            {letter.arabicName}
          </span>
        </h1>
        <p className="muted">{texts.short}</p>
        {letter.review.status === 'draft' && <DraftBadge />}
      </header>

      <HeadDiagram point={letter.point} />

      <section className="stack" style={{ gap: 8 }} aria-labelledby="lab-makhraj">
        <h2 id="lab-makhraj" className="h-small">
          {t.makhraj}
        </h2>
        <p>{texts.makhraj}</p>
        <p className="muted">
          {t.areas[letter.area].name} · {t.areas[letter.area].gloss}
        </p>
      </section>

      <section className="stack" style={{ gap: 8 }} aria-labelledby="lab-sifat">
        <h2 id="lab-sifat" className="h-small">
          {t.sifat}
        </h2>
        <ul className="lab-sifat">
          {letter.sifat.map((sifa) => (
            <li key={sifa}>
              <span className="chip">{t.sifa[sifa].name}</span>
              <span>{t.sifa[sifa].meaning}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="note stack" style={{ gap: 8 }} aria-labelledby="lab-mistakes">
        <h2 id="lab-mistakes" className="h-small">
          {t.mistakesTitle}
        </h2>
        <ul className="steps">
          {texts.mistakes.map((mistake) => (
            <li key={mistake}>{mistake}</li>
          ))}
        </ul>
      </section>

      {id === 'ra' && (
        <section className="card stack" style={{ gap: 8 }} aria-labelledby="lab-ra-rules">
          <div className="row" style={{ gap: 8 }}>
            <h2 id="lab-ra-rules" className="h-small">
              {t.raRules.title}
            </h2>
            <DraftBadge />
          </div>
          <p>{t.raRules.heavy}</p>
          <p>{t.raRules.light}</p>
          <p className="muted">{t.raRules.pending}</p>
        </section>
      )}

      <section className="stack" style={{ gap: 12 }} aria-labelledby="lab-listen">
        <h2 id="lab-listen">{t.listen.title}</h2>
        <p className="muted">{t.listen.intro}</p>
        <SpeedChoice />
        <Status player={player} />
        <div className="lab-words" dir="rtl">
          {words.map((word) => (
            <WordButton key={word.key} word={word} player={player} />
          ))}
        </div>
        <p className="muted lab-licence">{t.listen.source}</p>
      </section>

      <section className="card stack" style={{ gap: 8 }} aria-labelledby="lab-quiz">
        <h2 id="lab-quiz" className="h-small">
          {quiz.title}
        </h2>
        <p className="muted">{quiz.intro}</p>
        <Link
          className="btn btn-primary"
          to={`/labor/${id}/quiz`}
          style={{ alignSelf: 'flex-start' }}
        >
          {t.quiz.start}
        </Link>
      </section>

      {pairs.length > 0 && (
        <section className="stack" style={{ gap: 12 }} aria-labelledby="lab-pairs">
          <h2 id="lab-pairs">{t.pairs.title}</h2>
          <p className="muted">{t.pairs.intro}</p>
          <ul className="stack path-cards" style={{ gap: 10 }}>
            {pairs.map((pair) => (
              <li key={pair.words.map((w) => w.key).join()}>
                <Pair pair={pair} player={player} />
              </li>
            ))}
          </ul>
          {pairs.some((pair) => !pair.exact) && <p className="muted">{t.pairs.rare}</p>}
        </section>
      )}

      <section className="card stack" style={{ gap: 8 }} aria-labelledby="lab-self">
        <h2 id="lab-self" className="h-small">
          {t.self.title}
        </h2>
        <p>{t.self.text}</p>
        <button
          type="button"
          className="btn"
          disabled
          style={{ alignSelf: 'flex-start' }}
        >
          {t.self.record}
        </button>
      </section>
    </article>
  );
}

/** The speed for every word on the screen (0.5×–1×), shared with the muṣḥaf's player. */
export function SpeedChoice() {
  const { m } = useI18n();
  const speed = useSpeed();
  return (
    <div className="row segmented" role="group" aria-label={m.lab.listen.speed}>
      {SPEEDS.map((s) => (
        <button
          key={s}
          type="button"
          className="btn"
          aria-pressed={s === speed}
          onClick={() => chooseSpeed(s)}
        >
          {s}×
        </button>
      ))}
    </div>
  );
}

/** Loading the timings, or the recitation cannot be had. */
export function Status({ player }: { player: WordPlayer }) {
  const { m } = useI18n();
  if (player.failed) return <p role="alert">{m.lab.listen.failed}</p>;
  if (!player.ready) return <p className="muted">{m.lab.listen.loading}</p>;
  return null;
}

/** A word to hear: tap it, the reciter says it. */
function WordButton({ word, player }: { word: LabWord; player: WordPlayer }) {
  const { m } = useI18n();
  const { sura, aya, n } = whereOf(word.key);
  return (
    <button
      type="button"
      className="lab-word"
      data-playing={player.playing === word.key ? 'true' : undefined}
      aria-label={m.lab.listen.play(sura, aya, n)}
      disabled={!player.ready}
      onClick={() => player.play(word.key)}
    >
      <WordText word={word} />
      <span className="lab-word-where" dir="ltr">
        <PlayIcon pause={false} /> {m.lab.listen.where(sura, aya)}
      </span>
    </button>
  );
}

/** Two words that differ in the letter: each on its own, or both one after the other. */
function Pair({ pair, player }: { pair: LabPair; player: WordPlayer }) {
  const { m } = useI18n();
  const [a, b] = pair.words;
  return (
    <div className="card stack" style={{ gap: 8 }}>
      <div className="lab-pair" dir="rtl">
        <WordButton word={a} player={player} />
        <span className="lab-pair-vs" aria-hidden="true">
          ↔
        </span>
        <WordButton word={b} player={player} />
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted">{pair.exact ? m.lab.pairs.exact : m.lab.pairs.near}</span>
        <button
          type="button"
          className="btn"
          disabled={!player.ready}
          onClick={() => player.play([a.key, b.key])}
        >
          <PlayIcon pause={false} /> {m.lab.pairs.playBoth}
        </button>
      </div>
    </div>
  );
}
