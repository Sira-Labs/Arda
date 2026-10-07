import { INDOPAK_FIRST_PAGE, INDOPAK_ROWS } from './indopakPages';
import { MADINA_PAGES, madinaPageStart } from './pages';
import type { AyaRange } from './range';
import { SURAS, sura } from './suras';

/**
 * The printed muṣḥaf layouts whose page numbers an assignment may name (ADR-0014 update
 * 2026-10-07): the sheikh's 15-line IndoPak copy (ADR-0017) and the Madīna print. In both,
 * every page starts with a new āya, so a run of pages is a run of whole āyāt.
 */
export const PAGE_LAYOUTS = ['indopak-15', 'madina'] as const;
export type PageLayout = (typeof PAGE_LAYOUTS)[number];

/** Pages of a layout: `first`–`last` as printed (the IndoPak copy starts at page 2). */
export interface PageRun {
  layout: PageLayout;
  from: number;
  to: number;
}

const INDOPAK_STARTS = INDOPAK_ROWS.flatMap((row) =>
  row.split(' ').map((key) => key.split(':').map(Number) as [number, number])
);

/** The first and last printed page number of a layout. */
export function pagesOf(layout: PageLayout): { first: number; last: number } {
  return layout === 'madina'
    ? { first: 1, last: MADINA_PAGES }
    : { first: INDOPAK_FIRST_PAGE, last: INDOPAK_FIRST_PAGE + INDOPAK_STARTS.length - 1 };
}

/** The first āya on a printed page, or `undefined` when the layout has no such page. */
export function pageStart(
  layout: PageLayout,
  page: number
): [number, number] | undefined {
  if (!Number.isInteger(page)) return undefined;
  if (layout === 'madina') return madinaPageStart(page);
  return INDOPAK_STARTS[page - INDOPAK_FIRST_PAGE];
}

/** Whether the run names pages of its layout in order (one page: `from` = `to`). */
export function isPageRun(run: PageRun): boolean {
  const { first, last } = pagesOf(run.layout);
  return (
    Number.isInteger(run.from) &&
    Number.isInteger(run.to) &&
    first <= run.from &&
    run.from <= run.to &&
    run.to <= last
  );
}

/** The āya before `[s, a]`, the last of the sūra before when `a` is 1. */
function previous([s, a]: [number, number]): [number, number] {
  return a > 1 ? [s, a - 1] : [s - 1, sura(s - 1)!.ayas];
}

/**
 * The āyāt on a run of pages, one range per sūra in reading order: pages 8–9 of the IndoPak
 * copy are `[2:38–57]`; the Madīna page 604 is al-Ikhlāṣ, al-Falaq and an-Nās. Empty when the
 * run does not exist.
 */
export function pageAyat(run: PageRun): AyaRange[] {
  if (!isPageRun(run)) return [];
  const [startSura, startAya] = pageStart(run.layout, run.from)!;
  const next = pageStart(run.layout, run.to + 1);
  const last = SURAS.at(-1)!;
  const [endSura, endAya] = next ? previous(next) : [last.number, last.ayas];
  const ranges: AyaRange[] = [];
  for (let s = startSura; s <= endSura; s++) {
    ranges.push({
      sura: s,
      from: s === startSura ? startAya : 1,
      to: s === endSura ? endAya : sura(s)!.ayas,
    });
  }
  return ranges;
}
