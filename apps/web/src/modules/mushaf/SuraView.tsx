import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { sura as suraOf, wordKey } from '@arda/quran';
import { RuleLegend } from '@/components/RuleLegend';
import { TajweedSpans } from '@/components/TajweedText';
import { entryFor } from '@/content/packs';
import { useI18n } from '@/i18n/I18nProvider';
import { MushafSources } from './Sources';
import { usePack } from './usePack';
import { WordSheet } from './WordSheet';
import { wordSegments, type MushafWord } from './words';

interface Selected {
  key: string;
  word: MushafWord;
  label: string;
}

/** Āyāt `von`–`bis` from the query (an assignment), when they are a range of this sūra. */
function rangeOf(
  search: URLSearchParams,
  ayas: number
): { from: number; to: number } | null {
  const from = Number(search.get('von'));
  const to = Number(search.get('bis') ?? search.get('von'));
  return Number.isInteger(from) &&
    Number.isInteger(to) &&
    from >= 1 &&
    from <= to &&
    to <= ayas
    ? { from, to }
    : null;
}

/**
 * `/mushaf/:sura` (screen 2, spec F3): one sūra with its rules coloured and named, word by
 * word; tap a word for its rules. `?von=&bis=` marks an assignment's āyāt and scrolls to them.
 */
export function SuraView() {
  const { sura: param = '' } = useParams();
  const [search] = useSearchParams();
  const { m } = useI18n();
  const number = Number(param);
  const meta = Number.isInteger(number) ? suraOf(number) : undefined;
  const entry = meta ? entryFor(number) : undefined;
  const result = usePack(entry);
  const [selected, setSelected] = useState<Selected | null>(null);
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

  const digits = (n: number) => n.toLocaleString('ar-EG');
  const word = (w: MushafWord, key: string, label: string) => (
    <span key={key}>
      <button
        type="button"
        className="mushaf-word"
        aria-pressed={selected?.key === key}
        onClick={() => setSelected({ key, word: w, label })}
      >
        <TajweedSpans segments={wordSegments(w)} />
      </button>
      {w.a && <span className="pause-mark">{w.a}</span>}{' '}
    </span>
  );

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
        <p className="muted">{m.mushaf.tap}</p>
        {range && (
          <p className="chip range-chip" style={{ alignSelf: 'flex-start' }}>
            {m.mushaf.range(range.from, range.to)}
          </p>
        )}
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
                range && aya.aya >= range.from && aya.aya <= range.to
                  ? 'aya in-range'
                  : 'aya'
              }
            >
              {aya.words.map((w, i) =>
                word(
                  w,
                  wordKey('hafs', number, aya.aya, i + 1),
                  m.mushaf.word(number, aya.aya, i + 1)
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
    </article>
  );
}
