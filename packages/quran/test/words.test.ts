import { describe, expect, it } from 'vitest';
import {
  MADINA_PAGES,
  SURAS,
  hasWords,
  madinaPage,
  madinaPageStart,
  wordCount,
} from '../src/index';

describe('words per āya', () => {
  it('has a count for every āya and none beyond', () => {
    for (const s of SURAS) {
      for (let aya = 1; aya <= s.ayas; aya++) {
        expect(wordCount(s.number, aya), `${s.number}:${aya}`).toBeGreaterThan(0);
      }
      expect(wordCount(s.number, s.ayas + 1)).toBeUndefined();
    }
    expect(wordCount(115, 1)).toBeUndefined();
  });

  it('counts as the muṣḥaf page does', () => {
    expect(wordCount(1, 1)).toBe(4); // al-Fātiḥa's basmala is its first āya
    expect(wordCount(2, 1)).toBe(1); // alif lām mīm, without the basmala before it
    expect(wordCount(2, 2)).toBe(7); // pause signs are not words
    expect(wordCount(2, 282)).toBe(128); // the longest āya
    expect(wordCount(112, 1)).toBe(4);
  });
});

describe('word bounds of an assignment', () => {
  const range = { sura: 2, from: 1, to: 2 };

  it('accepts words inside the first and last āya', () => {
    expect(hasWords(range, { from: 1, to: 7 })).toBe(true);
    expect(hasWords({ sura: 2, from: 2, to: 2 }, { from: 3, to: 5 })).toBe(true);
  });

  it('refuses a word past the end of its āya, or backwards in one āya', () => {
    expect(hasWords(range, { from: 2, to: 3 })).toBe(false); // 2:1 has one word
    expect(hasWords(range, { from: 1, to: 8 })).toBe(false);
    expect(hasWords({ sura: 2, from: 2, to: 2 }, { from: 5, to: 3 })).toBe(false);
    expect(hasWords(range, { from: 0, to: 3 })).toBe(false);
    expect(hasWords({ sura: 2, from: 1, to: 287 }, { from: 1, to: 1 })).toBe(false);
  });
});

describe('the Madīna pages', () => {
  it('has 604 pages, each starting with an āya', () => {
    expect(MADINA_PAGES).toBe(604);
    expect(madinaPageStart(1)).toEqual([1, 1]);
    expect(madinaPageStart(2)).toEqual([2, 1]);
    expect(madinaPageStart(604)).toEqual([112, 1]);
    expect(madinaPageStart(605)).toBeUndefined();
  });

  it('finds the page of an āya', () => {
    expect(madinaPage(1, 7)).toBe(1);
    expect(madinaPage(2, 5)).toBe(2);
    expect(madinaPage(2, 6)).toBe(3);
    expect(madinaPage(2, 30)).toBe(6);
    expect(madinaPage(2, 37)).toBe(6);
    expect(madinaPage(114, 6)).toBe(604);
  });
});
