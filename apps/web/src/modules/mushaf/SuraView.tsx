import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { sura as suraOf } from '@arda/quran';
import { RuleLegend } from '@/components/RuleLegend';
import { entryFor } from '@/content/packs';
import { useI18n } from '@/i18n/I18nProvider';
import type { AssignmentRange } from '@/services/auth';
import { PageAssign, useTeaching } from './PageAssign';
import { MushafSources } from './Sources';
import { usePack } from './usePack';
import { AyaText, NONE, Word, type Place, type WordTap } from './AyaText';
import { WordSheet } from './WordSheet';

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

/** The words of āya `aya` between `start` and `end` (both included), or `NONE`. */
function wordsOf(aya: number, start: Place, end: Place): readonly [number, number] {
  if (aya < start.aya || aya > end.aya) return NONE;
  return [
    aya === start.aya ? start.n : 1,
    aya === end.aya ? end.n : Number.MAX_SAFE_INTEGER,
  ];
}

/**
 * Āyāt rendered at first, and added per tick after: al-Baqara has 286 āyāt and 6121 words, and
 * rendering them in one go keeps a slow phone busy for seconds before anything shows.
 */
const BATCH = 40;

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
  const [selected, setSelected] = useState<WordTap | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<{ start: Place; end?: Place } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const range = meta ? rangeOf(search, meta.ayas) : null;
  const sura = result?.ok ? result.pack.suras.find((s) => s.sura === number) : undefined;
  const total = sura?.ayat.length ?? 0;
  // How many āyāt are rendered, per sūra: the first batch, or up to the end of the assignment.
  const first = Math.max(BATCH, range?.to ?? 0);
  const [shown, setShown] = useState({ sura: number, count: first });
  const count = shown.sura === number ? shown.count : first;

  useEffect(() => {
    if (count >= total) return;
    const timer = setTimeout(() => setShown({ sura: number, count: count + BATCH }), 0);
    return () => clearTimeout(timer);
  }, [number, count, total]);

  useEffect(() => {
    if (sura && range) document.getElementById(`aya-${range.from}`)?.scrollIntoView?.();
    // Scroll once the sūra is there, and again when the range changes.
  }, [sura !== undefined, range?.from]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(() => setSelected(null), []);
  const onTap = useCallback(
    (tap: WordTap) => {
      if (!picking) setSelected(tap);
      else if (tap.place) {
        const place = tap.place;
        setPicked((current) =>
          !current || current.end
            ? { start: place }
            : { start: current.start, end: place }
        );
      }
    },
    [picking]
  );

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
  const marked = range?.words
    ? {
        start: { aya: range.from, n: range.words.from },
        end: { aya: range.to, n: range.words.to },
      }
    : null;
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
        {picking && !given && (
          // Until both words are picked there is no panel yet to cancel from.
          <button
            className="btn"
            type="button"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              setPicking(false);
              setPicked(null);
            }}
          >
            {m.mushaf.cancel}
          </button>
        )}
        {notice && <p role="status">{notice}</p>}
      </header>

      <div className="quran mushaf-text" data-script="madina" lang="ar" dir="rtl">
        {sura.basmala && (
          <p className="basmala">
            {sura.basmala.map((word, i) => {
              const key = `basmala:${number}:${i + 1}`;
              return (
                <Word
                  key={key}
                  tap={{ key, word, label: m.mushaf.sura(number) }}
                  pressed={!picking && selected?.key === key}
                  onTap={onTap}
                />
              );
            })}
          </p>
        )}
        <p>
          {sura.ayat.slice(0, count).map((aya) => {
            const [markFrom, markTo] = marked
              ? wordsOf(aya.aya, marked.start, marked.end)
              : NONE;
            const [pickFrom, pickTo] = span
              ? wordsOf(aya.aya, span.start, span.end)
              : NONE;
            return (
              <AyaText
                key={aya.aya}
                sura={number}
                aya={aya}
                whole={
                  range !== null &&
                  !range.words &&
                  aya.aya >= range.from &&
                  aya.aya <= range.to
                }
                markFrom={markFrom}
                markTo={markTo}
                pickFrom={pickFrom}
                pickTo={pickTo}
                picking={picking}
                selectedKey={selected?.place?.aya === aya.aya ? selected.key : null}
                onTap={onTap}
              />
            );
          })}
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
