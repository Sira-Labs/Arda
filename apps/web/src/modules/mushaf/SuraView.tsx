import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { sura as suraOf, wordKey } from '@arda/quran';
import { RuleLegend } from '@/components/RuleLegend';
import { TajweedSpans } from '@/components/TajweedText';
import { entryFor } from '@/content/packs';
import { useI18n } from '@/i18n/I18nProvider';
import type { AssignmentRange } from '@/services/auth';
import { PageAssign, useTeaching } from './PageAssign';
import { MushafSources } from './Sources';
import { usePack } from './usePack';
import { WordSheet } from './WordSheet';
import { wordSegments, type MushafWord } from './words';

interface Selected {
  key: string;
  word: MushafWord;
  label: string;
}

/** A word's place: āya and its number in the āya, from 1. */
interface Place {
  aya: number;
  n: number;
}

const notAfter = (a: Place, b: Place) => a.aya < b.aya || (a.aya === b.aya && a.n <= b.n);

const positive = (value: string | null): number | null => {
  const n = Number(value);
  return value !== null && Number.isInteger(n) && n >= 1 ? n : null;
};

/**
 * The assignment's āyāt from the query: `von`–`bis`, and with `wvon`/`wbis` the words it starts
 * and ends at (S3.2). Ignored when it is not a range of this sūra.
 */
function rangeOf(search: URLSearchParams, ayas: number): AssignmentRange | null {
  const from = positive(search.get('von'));
  const to = positive(search.get('bis') ?? search.get('von'));
  if (from === null || to === null || from > to || to > ayas) return null;
  const wordFrom = positive(search.get('wvon'));
  const wordTo = positive(search.get('wbis'));
  const words =
    wordFrom !== null && wordTo !== null && (from < to || wordFrom <= wordTo)
      ? { from: wordFrom, to: wordTo }
      : undefined;
  return { sura: 0, from, to, ...(words ? { words } : {}) };
}

/** Whether the word at `place` is inside `range` (whole āyāt, or from word to word). */
const covers = (range: AssignmentRange, place: Place) =>
  notAfter({ aya: range.from, n: range.words?.from ?? 1 }, place) &&
  notAfter(place, { aya: range.to, n: range.words?.to ?? Number.MAX_SAFE_INTEGER });

/**
 * `/mushaf/:sura` (screen 2, spec F3): one sūra with its rules coloured and named, word by
 * word; tap a word for its rules. `?von=&bis=` (and `wvon=&wbis=`) marks an assignment and
 * scrolls to it. A teacher can pick words here and give them as an assignment (S3.2).
 */
export function SuraView() {
  const { sura: param = '' } = useParams();
  const [search] = useSearchParams();
  const { m } = useI18n();
  const number = Number(param);
  const meta = Number.isInteger(number) ? suraOf(number) : undefined;
  const entry = meta ? entryFor(number) : undefined;
  const result = usePack(entry);
  const teaching = useTeaching();
  const [selected, setSelected] = useState<Selected | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<{ start: Place; end?: Place } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const close = useCallback(() => setSelected(null), []);
  const range = meta ? rangeOf(search, meta.ayas) : null;
  const ready = result?.ok === true;

  useEffect(() => {
    if (ready && range) document.getElementById(`aya-${range.from}`)?.scrollIntoView?.();
    // Scroll once the sūra is there, and again when the range changes.
  }, [ready, range?.from]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = <Link to="/mushaf">{m.mushaf.all}</Link>;
  if (!meta || !entry) {
    return (
      <div className="stack">
        {back}
        <p role="alert">{m.mushaf.failure.missing}</p>
      </div>
    );
  }
  if (result === null) {
    return (
      <div className="stack">
        {back}
        <p className="muted" role="status">
          {m.mushaf.loading}
        </p>
      </div>
    );
  }
  if (!result.ok) {
    return (
      <div className="stack">
        {back}
        <p role="alert">{m.mushaf.failure[result.failure]}</p>
      </div>
    );
  }
  const sura = result.pack.suras.find((s) => s.sura === number);
  if (!sura) {
    return (
      <div className="stack">
        {back}
        <p role="alert">{m.mushaf.failure.missing}</p>
      </div>
    );
  }

  /** The words picked so far, in reading order. */
  const pickedRange = (): { start: Place; end: Place } | null => {
    if (!picked) return null;
    const end = picked.end ?? picked.start;
    return notAfter(picked.start, end)
      ? { start: picked.start, end }
      : { start: end, end: picked.start };
  };
  const pick = (place: Place) =>
    setPicked((current) =>
      !current || current.end ? { start: place } : { start: current.start, end: place }
    );

  /** The picked words as an assignment's range; whole āyāt when they begin and end so. */
  const assignmentRange = (): AssignmentRange | null => {
    const span = pickedRange();
    if (!picked?.end || !span) return null;
    const lastWords = sura.ayat[span.end.aya - 1]!.words.length;
    const whole = span.start.n === 1 && span.end.n === lastWords;
    return {
      sura: number,
      from: span.start.aya,
      to: span.end.aya,
      ...(whole ? {} : { words: { from: span.start.n, to: span.end.n } }),
    };
  };

  const span = picking ? pickedRange() : null;
  const digits = (n: number) => n.toLocaleString('ar-EG');
  const word = (w: MushafWord, key: string, label: string, place?: Place) => {
    const isPicked =
      span && place && notAfter(span.start, place) && notAfter(place, span.end);
    const isAssigned = range?.words && place && covers(range, place);
    return (
      <span
        key={key}
        className={isPicked ? 'picked' : isAssigned ? 'in-range' : undefined}
      >
        <button
          type="button"
          className="mushaf-word"
          aria-pressed={picking ? Boolean(isPicked) : selected?.key === key}
          onClick={() => {
            if (picking) {
              if (place) pick(place);
            } else {
              setSelected({ key, word: w, label });
            }
          }}
        >
          <TajweedSpans segments={wordSegments(w)} />
        </button>
        {w.a && <span className="pause-mark">{w.a}</span>}{' '}
      </span>
    );
  };
  const given = assignmentRange();

  return (
    <article className="stack" style={{ gap: 20, maxWidth: 820 }}>
      <nav className="row" style={{ justifyContent: 'space-between' }}>
        {back}
        <span className="row" style={{ gap: 16 }}>
          {number > entry.suras[0] && (
            <Link to={`/mushaf/${number - 1}`}>{m.mushaf.previous}</Link>
          )}
          {number < entry.suras[1] && (
            <Link to={`/mushaf/${number + 1}`}>{m.mushaf.next}</Link>
          )}
        </span>
      </nav>
      <header className="stack" style={{ gap: 6 }}>
        <p className="eyebrow">
          {m.mushaf.sura(number)} · {m.mushaf.ayat(meta.ayas)}
        </p>
        <h1 className="sura-title" lang="ar" dir="rtl">
          {sura.name}
        </h1>
        <p className="muted">{picking ? m.mushaf.pick : m.mushaf.tap}</p>
        {range && (
          <p className="chip range-chip" style={{ alignSelf: 'flex-start' }}>
            {range.words
              ? m.assignments.rangeWords(
                  number,
                  range.from,
                  range.words.from,
                  range.to,
                  range.words.to
                )
              : m.mushaf.range(range.from, range.to)}
          </p>
        )}
        {teaching.length > 0 && !picking && (
          <button
            className="btn"
            type="button"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              setSelected(null);
              setNotice(null);
              setPicking(true);
            }}
          >
            {m.mushaf.assign}
          </button>
        )}
        {notice && <p role="status">{notice}</p>}
      </header>

      <div className="quran mushaf-text" data-script="madina" lang="ar" dir="rtl">
        {sura.basmala && (
          <p className="basmala">
            {sura.basmala.map((w, i) =>
              word(w, `basmala:${number}:${i + 1}`, m.mushaf.sura(number))
            )}
          </p>
        )}
        <p>
          {sura.ayat.map((aya) => (
            <span
              key={aya.aya}
              id={`aya-${aya.aya}`}
              className={
                range && !range.words && aya.aya >= range.from && aya.aya <= range.to
                  ? 'aya in-range'
                  : 'aya'
              }
            >
              {aya.words.map((w, i) =>
                word(
                  w,
                  wordKey('hafs', number, aya.aya, i + 1),
                  m.mushaf.word(number, aya.aya, i + 1),
                  { aya: aya.aya, n: i + 1 }
                )
              )}
              <span className="aya-end" aria-label={`${aya.aya}`}>
                {/* The muṣḥaf numbers its āyāt in Arabic-Indic digits in every language. */}
                {'۝'}
                {digits(aya.aya)}
              </span>{' '}
            </span>
          ))}
        </p>
      </div>

      <RuleLegend />
      <MushafSources />
      {selected && (
        <WordSheet word={selected.word} label={selected.label} onClose={close} />
      )}
      {picking && given && (
        <PageAssign
          range={given}
          onGiven={() => {
            setPicking(false);
            setPicked(null);
            setNotice(m.assignments.form.given);
          }}
          onCancel={() => {
            setPicking(false);
            setPicked(null);
          }}
        />
      )}
    </article>
  );
}
