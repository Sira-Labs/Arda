import { describe, expect, it } from 'vitest';
import {
  MADINA_PAGES,
  PAGE_LAYOUTS,
  SURAS,
  isPageRun,
  madinaPage,
  pageAyat,
  pageStart,
  pagesOf,
} from '../src/index';

describe('the printed page layouts', () => {
  it('numbers the IndoPak pages as the sheikh’s copy does, the Madīna ones from 1', () => {
    expect(pagesOf('indopak-15')).toEqual({ first: 2, last: 611 });
    expect(pagesOf('madina')).toEqual({ first: 1, last: MADINA_PAGES });
    // The pages checked against his copy (ADR-0017): 6 and 7, 597 and 598.
    expect(pageStart('indopak-15', 2)).toEqual([1, 1]);
    expect(pageStart('indopak-15', 3)).toEqual([2, 1]);
    expect(pageStart('indopak-15', 1)).toBeUndefined();
    expect(pageStart('indopak-15', 612)).toBeUndefined();
  });

  it('gives the āyāt of a run of pages, whole and in one range per sūra', () => {
    expect(pageAyat({ layout: 'indopak-15', from: 8, to: 9 })).toEqual([
      { sura: 2, from: 38, to: 57 },
    ]);
    expect(pageAyat({ layout: 'madina', from: 1, to: 1 })).toEqual([
      { sura: 1, from: 1, to: 7 },
    ]);
    expect(pageAyat({ layout: 'madina', from: 604, to: 604 })).toEqual([
      { sura: 112, from: 1, to: 4 },
      { sura: 113, from: 1, to: 5 },
      { sura: 114, from: 1, to: 6 },
    ]);
    // Across the end of al-Fātiḥa into al-Baqara.
    expect(pageAyat({ layout: 'indopak-15', from: 2, to: 3 })).toEqual([
      { sura: 1, from: 1, to: 7 },
      { sura: 2, from: 1, to: 4 },
    ]);
  });

  it('covers every āya exactly once, page after page', () => {
    for (const layout of PAGE_LAYOUTS) {
      const { first, last } = pagesOf(layout);
      const all = pageAyat({ layout, from: first, to: last });
      expect(all).toHaveLength(114);
      all.forEach((range, i) => {
        expect(range).toEqual({ sura: i + 1, from: 1, to: SURAS[i]!.ayas });
      });
      let next: [number, number] = [1, 1];
      for (let page = first; page <= last; page++) {
        const ranges = pageAyat({ layout, from: page, to: page });
        expect(ranges.length).toBeGreaterThan(0);
        expect([ranges[0]!.sura, ranges[0]!.from]).toEqual(next);
        const end = ranges.at(-1)!;
        next =
          end.to < SURAS[end.sura - 1]!.ayas ? [end.sura, end.to + 1] : [end.sura + 1, 1];
      }
      expect(next).toEqual([115, 1]);
    }
  });

  it('agrees with the Madīna page of an āya', () => {
    for (let page = 1; page <= MADINA_PAGES; page++) {
      const [s, a] = pageStart('madina', page)!;
      expect(madinaPage(s, a)).toBe(page);
    }
  });

  it('refuses runs that are out of order or off the layout', () => {
    expect(isPageRun({ layout: 'indopak-15', from: 8, to: 9 })).toBe(true);
    expect(isPageRun({ layout: 'indopak-15', from: 1, to: 2 })).toBe(false);
    expect(isPageRun({ layout: 'madina', from: 9, to: 8 })).toBe(false);
    expect(isPageRun({ layout: 'madina', from: 600, to: 605 })).toBe(false);
    expect(isPageRun({ layout: 'madina', from: 1.5, to: 2 })).toBe(false);
    expect(pageAyat({ layout: 'madina', from: 0, to: 1 })).toEqual([]);
  });
});
