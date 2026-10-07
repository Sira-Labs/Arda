import { readFileSync } from 'node:fs';
import { pageStart, type Pack, type PackIndex } from '@arda/quran';
import { describe, expect, it } from 'vitest';
import { indopakPageStarts } from '../src/pages';

const web = (path: string) => new URL(`../../apps/web/${path}`, import.meta.url);
const index = JSON.parse(
  readFileSync(web('public/packs/index.json'), 'utf8')
) as PackIndex;
const indopakPacks = index.packs
  .filter((entry) => entry.script === 'indopak')
  .map(
    (entry) => JSON.parse(readFileSync(web(`public/packs/${entry.file}`), 'utf8')) as Pack
  );

const page = (...ayat: number[][]) =>
  ayat.map((pages) => pages.map((p) => ({ page: p })));

describe('the IndoPak page starts', () => {
  it('takes the first āya on each page, over headings and the basmala', () => {
    expect(
      indopakPageStarts({
        pages: 3,
        suras: [
          { sura: 1, ayat: page([1, 1], [1]) },
          { sura: 2, ayat: page([2], [2, 2], [3]) },
        ],
      })
    ).toEqual([
      [1, 1],
      [2, 1],
      [2, 3],
    ]);
  });

  it('refuses a page that starts inside an āya, or has none', () => {
    expect(() =>
      indopakPageStarts({ pages: 2, suras: [{ sura: 1, ayat: page([1, 2]) }] })
    ).toThrow(/starts inside 1:1/);
    expect(() =>
      indopakPageStarts({ pages: 2, suras: [{ sura: 1, ayat: page([1]) }] })
    ).toThrow(/page 2 has no āya/);
  });

  it('matches the pages the shipped IndoPak packs print', () => {
    expect(indopakPacks.length).toBeGreaterThan(0);
    for (const pack of indopakPacks) {
      const offset = pack.layout!.pageOffset;
      const seen = new Set<number>();
      for (const s of pack.suras) {
        for (const aya of s.ayat) {
          const printed = aya.words[0]!.at![0] + offset;
          if (seen.has(printed)) continue;
          seen.add(printed);
          expect(pageStart('indopak-15', printed), `page ${printed}`).toEqual([
            s.sura,
            aya.aya,
          ]);
        }
      }
    }
  });
});
