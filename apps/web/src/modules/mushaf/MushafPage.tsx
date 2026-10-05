import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { JUZ_NAMES, sura as suraOf, type PackIndexEntry } from '@arda/quran';
import { RuleLegend } from '@/components/RuleLegend';
import { builtIndex, type MushafPack } from '@/content/packs';
import { useI18n } from '@/i18n/I18nProvider';
import type { AssignmentRange } from '@/services/auth';
import { chooseColours, useMushafColours } from './colours';
import { useLineFit } from './fit';
import { PageAssign, useTeaching } from './PageAssign';
import {
  pageBlocks,
  pageHeader,
  pageRecitation,
  surasOn,
  type Block,
  type PageWord,
  type Place,
} from './pageModel';
import { useMushafScript, type MushafScript } from './script';
import { MiniPlayer, PlayerBar } from './PlayerBar';
import { usePageSwipe } from './swipe';
import { usePlayer, type PlayItem, type Recited } from './usePlayer';
import { MushafSources } from './Sources';
import { usePack } from './usePack';
import { Word, type WordTap } from './Word';
import { WordSheet } from './WordSheet';

const notAfter = (a: Place, b: Place) =>
  a.sura < b.sura ||
  (a.sura === b.sura && (a.aya < b.aya || (a.aya === b.aya && a.n <= b.n)));

const positive = (value: string | null): number | null => {
  const n = Number(value);
  return value !== null && Number.isInteger(n) && n >= 1 ? n : null;
};

/**
 * The assignment to mark, from the query: `sura`, `von`–`bis`, and with `wvon`/`wbis` the words
 * it starts and ends at (S3.2). Ignored when it is not a range of that sūra.
 */
export function rangeOf(search: URLSearchParams): AssignmentRange | null {
  const sura = positive(search.get('sura'));
  const meta = sura === null ? undefined : suraOf(sura);
  const from = positive(search.get('von'));
  const to = positive(search.get('bis') ?? search.get('von'));
  if (!meta || from === null || to === null || from > to || to > meta.ayas) return null;
  const wordFrom = positive(search.get('wvon'));
  const wordTo = positive(search.get('wbis'));
  const words =
    wordFrom !== null && wordTo !== null && (from < to || wordFrom <= wordTo)
      ? { from: wordFrom, to: wordTo }
      : undefined;
  return { sura: meta.number, from, to, ...(words ? { words } : {}) };
}

/** Whether the word at `place` is inside `range` (whole āyāt, or from word to word). */
const covers = (range: AssignmentRange, place: Place) =>
  place.sura === range.sura &&
  place.aya >= 1 &&
  notAfter({ sura: range.sura, aya: range.from, n: range.words?.from ?? 1 }, place) &&
  notAfter(place, {
    sura: range.sura,
    aya: range.to,
    n: range.words?.to ?? Number.MAX_SAFE_INTEGER,
  });

/** Whether keys typed into `target` edit something (a field, a list, editable text). */
const editing = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && target.isContentEditable);

/** A number as the muṣḥaf prints it, in Arabic-Indic digits in every language. */
const arabic = (n: number) => n.toLocaleString('ar-EG');

/** The pack of a script that has the printed page. */
const entryForPage = (page: number, script: MushafScript): PackIndexEntry | undefined =>
  builtIndex.packs.find(
    (p) => p.script === script && page >= p.pages[0] && page <= p.pages[1]
  );

/**
 * `/mushaf/seite/:page` (screen 2, spec F3): one page of the muṣḥaf as printed: the IndoPak
 * page line by line as in the sheikh's copy, framed and ruled, with the sūra, page and para in
 * its head; or the Madīna page's āyāt (ADR-0017). Rules are coloured and named, or hidden for
 * plain ink; tap a word for its rules; turn the page with the buttons, a swipe or the
 * keyboard; pinch-zooming never turns it. `?sura=&von=&bis=` (and `wvon=&wbis=`) marks an assignment on every page it spans.
 * A teacher can pick words, across pages, and give them as an assignment (S3.2).
 */
export function MushafPage() {
  const { page: param = '' } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { m } = useI18n();
  const script = useMushafScript();
  const colours = useMushafColours();
  const page = Number(param);
  const entry = Number.isInteger(page) ? entryForPage(page, script) : undefined;
  const result = usePack(entry);
  const teaching = useTeaching();
  const [selected, setSelected] = useState<(WordTap & { indopak: boolean }) | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<{ start: Place; end?: Place } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const range = rangeOf(search);
  const pack = result?.ok ? result.pack : undefined;
  const blocks = useMemo(() => (pack ? pageBlocks(pack, page) : []), [pack, page]);

  const go = useCallback(
    (to: number) =>
      navigate({ pathname: `/mushaf/seite/${to}`, search: search.toString() }),
    [navigate, search]
  );
  // The page the last turn went to and which way, so that page slides in from that side;
  // a page reached otherwise (history, a link) does not replay an old slide.
  const [entering, setEntering] = useState<{
    to: number;
    way: 'next' | 'previous';
  } | null>(null);
  const turn = useCallback(
    (by: 1 | -1) => {
      const to = page + by;
      if (to < 1 || !entryForPage(to, script)) return;
      setEntering({ to, way: by === 1 ? 'next' : 'previous' });
      go(to);
    },
    [page, script, go]
  );
  const swipe = usePageSwipe(turn);
  const player = usePlayer();
  const { stop } = player;
  // A turned page starts silent: the recitation was of the page before.
  useEffect(() => stop, [page, stop]);
  const lines = useRef<HTMLDivElement>(null);
  useLineFit(lines, blocks);
  const recitation = useMemo(() => pageRecitation(blocks), [blocks]);
  useFollowRecitation(lines, player.recited);

  useEffect(() => {
    // The muṣḥaf reads right to left: the next page lies to the left.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      // The arrows belong to a field being edited (the assignment form's note or ḥalaqa),
      // and to the browser when a modifier is held (Alt+← is "back").
      if (
        selected ||
        editing(event.target) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      event.preventDefault();
      turn(event.key === 'ArrowLeft' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn, selected]);

  const close = useCallback(() => setSelected(null), []);
  const onTap = useCallback(
    (tap: WordTap, indopak: boolean) => {
      if (!picking) {
        setSelected({ ...tap, indopak });
        return;
      }
      const place = tap.place;
      if (!place || place.aya < 1) return;
      // An assignment stays in one sūra: a word of another sūra starts the pick again.
      setPicked((current) =>
        !current || current.end || current.start.sura !== place.sura
          ? { start: place }
          : { start: current.start, end: place }
      );
    },
    [picking]
  );

  const back = <Link to="/mushaf">{m.mushaf.all}</Link>;
  if (!entry) {
    return (
      <div className="stack">
        {back}
        <p role="alert">{m.mushaf.failure.missingPage}</p>
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
  if (!pack) {
    return (
      <div className="stack">
        {back}
        <p role="alert">{m.mushaf.failure[result.ok ? 'missing' : result.failure]}</p>
      </div>
    );
  }

  const indopak = pack.script === 'indopak';
  const span = picking && picked ? orderedPick(picked) : null;
  const given = picked?.end && span ? assignmentRange(pack, span) : null;
  const marked = (place: Place) =>
    span && notAfter(span.start, place) && notAfter(place, span.end)
      ? 'picked'
      : range && covers(range, place)
        ? 'in-range'
        : undefined;
  const recited = player.recited;
  // The tapped word's āya is marked while its sheet is open (owner, 2026-10-05).
  const chosen = !picking ? selected?.place : undefined;
  const inChosen = (place: Place) =>
    !!chosen && place.sura === chosen.sura && place.aya === chosen.aya;
  const recitedNow = (place: Place) =>
    !!recited &&
    place.sura === recited.sura &&
    place.aya === recited.aya &&
    place.n >= recited.from &&
    place.n <= recited.to;
  const word = (w: PageWord) => (
    <Word
      key={w.key}
      tap={{
        key: w.key,
        word: w.word,
        label:
          w.place.aya === 0
            ? m.mushaf.sura(w.place.sura)
            : m.mushaf.word(w.place.sura, w.place.aya, w.place.n),
        place: w.place,
      }}
      className={marked(w.place)}
      pressed={picking ? marked(w.place) === 'picked' : selected?.key === w.key}
      playing={recitedNow(w.place)}
      chosen={inChosen(w.place)}
      onTap={(tap) => onTap(tap, indopak)}
      indopak={indopak}
      ayaEnd={w.ayaEnd}
    />
  );
  const suras = surasOn(blocks);
  const head = pageHeader(blocks);

  return (
    <article
      className="stack"
      // Room below the page for the docked player or sheet, so they never cover its end.
      data-docked={selected ? 'sheet' : player.current ? 'player' : undefined}
      style={{ gap: 16, maxWidth: 820 }}
    >
      {back}
      <header className="stack" style={{ gap: 6 }}>
        <p className="eyebrow">
          {m.mushaf.page(page)} · {m.mushaf.scripts[script].name}
        </p>
        <h1 className="h-small">
          {suras.map((s) => (
            <span key={s} className="page-sura" lang="ar" dir="rtl">
              {suraOf(s)?.name}
            </span>
          ))}
        </h1>
        <p className="muted">{picking ? m.mushaf.pick : m.mushaf.tap}</p>
        <button
          type="button"
          className={colours === 'tajweed' ? 'btn btn-quiet' : 'btn'}
          aria-pressed={colours === 'tajweed'}
          style={{ alignSelf: 'flex-start' }}
          onClick={() => chooseColours(colours === 'tajweed' ? 'plain' : 'tajweed')}
        >
          {m.mushaf.colours}
        </button>
        {range && (
          <p className="chip range-chip" style={{ alignSelf: 'flex-start' }}>
            {range.words
              ? m.assignments.rangeWords(
                  range.sura,
                  range.from,
                  range.words.from,
                  range.to,
                  range.words.to
                )
              : m.mushaf.range(range.from, range.to)}
          </p>
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

      <PlayerBar player={player} page={recitation} />
      <div className="mushaf-sheet" data-script={indopak ? 'indopak' : 'madina'}>
        {head && (
          // The printed head: the para on the right, the page, the sūra on the left. The
          // screen's own header above names them for screen readers.
          <div className="mushaf-head" lang="ar" dir="rtl" aria-hidden="true">
            <span>
              {indopak ? JUZ_NAMES[head.juz - 1] : 'الجزء'} {arabic(head.juz)}
            </span>
            <span className="mushaf-head-page">{arabic(page)}</span>
            <span>
              {suraOf(head.sura)?.name} {arabic(head.sura)}
            </span>
          </div>
        )}
        <div
          key={page}
          ref={lines}
          className="quran mushaf-text mushaf-page"
          data-script={indopak ? 'indopak' : 'madina'}
          data-layout={indopak ? 'lines' : 'flow'}
          data-colours={colours}
          data-entering={entering?.to === page ? entering.way : undefined}
          // The two opening pages (al-Fātiḥa, al-Baqara's start) print shorter lines.
          data-opening={
            indopak && page - pack.layout!.pageOffset <= 2 ? 'true' : undefined
          }
          lang="ar"
          dir="rtl"
          style={
            swipe.offset
              ? { transform: `translateX(${swipe.offset}px)`, transition: 'none' }
              : undefined
          }
          {...swipe.handlers}
        >
          {blocks.map((block) => blockView(block, word, indopak, m))}
        </div>
      </div>
      <nav className="page-turn" aria-label={m.mushaf.page(page)}>
        {/* A right-to-left book: the next page lies to the left. */}
        <button
          type="button"
          className="btn"
          disabled={!entryForPage(page + 1, script)}
          onClick={() => turn(1)}
        >
          <span aria-hidden="true">←</span> {m.mushaf.nextPage}
        </button>
        <button
          type="button"
          className="btn"
          disabled={page <= 1 || !entryForPage(page - 1, script)}
          onClick={() => turn(-1)}
        >
          {m.mushaf.previousPage} <span aria-hidden="true">→</span>
        </button>
      </nav>

      <RuleLegend />
      <MushafSources />
      {selected && (
        <WordSheet
          word={selected.word}
          label={selected.label}
          onClose={close}
          script={selected.indopak ? 'indopak' : 'madina'}
          aya={
            selected.place
              ? {
                  label: m.mushaf.player.aya(selected.place.sura, selected.place.aya),
                  // From this āya to the page's end; or this āya again and again.
                  onPlay: () => {
                    player.play(fromAya(recitation, selected.place!));
                    close();
                  },
                  onRepeat: () => {
                    player.repeat([
                      { sura: selected.place!.sura, aya: selected.place!.aya },
                    ]);
                    close();
                  },
                }
              : undefined
          }
        />
      )}
      {!selected && !(picking && given) && <MiniPlayer player={player} />}
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

type Messages = ReturnType<typeof useI18n>['m'];

function blockView(
  block: Block,
  word: (w: PageWord) => React.ReactNode,
  indopak: boolean,
  m: Messages
) {
  switch (block.kind) {
    case 'heading':
      return (
        <p key={`h${block.sura}`} className="sura-heading">
          <span>{suraOf(block.sura)?.name}</span>
          <span className="sr-only"> · {m.mushaf.sura(block.sura)}</span>
        </p>
      );
    case 'basmala':
      return (
        <p key={`b${block.sura}`} className="basmala">
          {block.words.map(word)}
        </p>
      );
    case 'line':
      return (
        <p key={`l${block.line}`} className="mushaf-line" data-line={block.line}>
          {block.words.map(word)}
        </p>
      );
    case 'flow':
      return (
        <p
          key={`f${block.words[0]!.key}`}
          className={indopak ? 'mushaf-line' : undefined}
        >
          {block.words.map(word)}
        </p>
      );
  }
}

/** The page's āyāt from `place`'s on (itself alone if the page does not list it). */
function fromAya(recitation: readonly PlayItem[], place: Place): readonly PlayItem[] {
  const at = recitation.findIndex((r) => r.sura === place.sura && r.aya === place.aya);
  return at < 0 ? [{ sura: place.sura, aya: place.aya }] : recitation.slice(at);
}

/**
 * Keeps the word being recited in sight: when it moves below the docked player or above the
 * screen, the page scrolls it to the middle.
 */
function useFollowRecitation(
  page: React.RefObject<HTMLElement | null>,
  recited: Recited | null
) {
  const key = recited ? `${recited.sura}:${recited.aya}:${recited.from}` : '';
  useEffect(() => {
    const word = key ? page.current?.querySelector('[data-playing="true"]') : null;
    if (!word || typeof word.scrollIntoView !== 'function') return;
    const { top, bottom } = word.getBoundingClientRect();
    // The dock and the navigation take the lowest part of the screen.
    if (top >= 72 && bottom <= window.innerHeight - 220) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    word.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
  }, [key, page]);
}

/** The words picked so far, in reading order. */
function orderedPick(picked: { start: Place; end?: Place }): {
  start: Place;
  end: Place;
} {
  const end = picked.end ?? picked.start;
  return notAfter(picked.start, end)
    ? { start: picked.start, end }
    : { start: end, end: picked.start };
}

/** The picked words as an assignment's range; whole āyāt when they begin and end so. */
function assignmentRange(
  pack: MushafPack,
  span: { start: Place; end: Place }
): AssignmentRange | null {
  const sura = pack.suras.find((s) => s.sura === span.start.sura);
  const lastWords = sura?.ayat[span.end.aya - 1]?.words.length;
  if (!sura || !lastWords) return null;
  const whole = span.start.n === 1 && span.end.n === lastWords;
  return {
    sura: sura.sura,
    from: span.start.aya,
    to: span.end.aya,
    ...(whole ? {} : { words: { from: span.start.n, to: span.end.n } }),
  };
}
