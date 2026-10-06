import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Pack, PackIndex } from '@arda/quran';
import {
  LAB_PICKS,
  PAUSE_SIGNS,
  buildLab,
  labModule,
  type ShippedTimings,
} from '../src/lab';

const web = (path: string) =>
  fileURLToPath(new URL(`../../apps/web/${path}`, import.meta.url));
const index = JSON.parse(
  readFileSync(web('public/packs/index.json'), 'utf8')
) as PackIndex;
const packs = index.packs.map(
  (entry) => JSON.parse(readFileSync(web(`public/packs/${entry.file}`), 'utf8')) as Pack
);
const timings = JSON.parse(
  readFileSync(web('public/audio/timings/husary-muallim.json'), 'utf8')
) as ShippedTimings;
const shipped = {
  uthmani: packs.filter((p) => p.script === 'uthmani'),
  indopak: packs.filter((p) => p.script === 'indopak'),
};

describe('the letter lab’s words', () => {
  const lab = buildLab(shipped, timings);

  it('are the ones the app ships, byte for byte', () => {
    expect(labModule(lab)).toBe(readFileSync(web('src/modules/lab/words.ts'), 'utf8'));
  });

  it('give every letter at least eight words, and rāʾ heavy and light ones', () => {
    for (const letter of Object.keys(LAB_PICKS)) {
      expect(lab.words.filter((w) => w.letter === letter).length).toBeGreaterThanOrEqual(
        8
      );
    }
    const ra = lab.words.filter((w) => w.letter === 'ra');
    expect(ra.filter((w) => w.weight === 'heavy').length).toBeGreaterThanOrEqual(5);
    expect(ra.filter((w) => w.weight === 'light').length).toBeGreaterThanOrEqual(5);
  });

  it('leave out the pause signs IndoPak writes into a word', () => {
    // al-ʿusr (al-Baqara 185) carries a small high zain, a pause sign, not the letter.
    const usr = lab.pairs.flatMap((p) => p.words).find((w) => w.key === 'hafs:2:185:35');
    expect(usr?.indopak).not.toMatch(PAUSE_SIGNS);
    expect(usr?.indopak.includes('ز')).toBe(false);
    for (const word of lab.words) expect(word.indopak, word.key).not.toMatch(PAUSE_SIGNS);
  });

  it('mark the letter in both scripts', () => {
    const sign = { sin: 'س', zay: 'ز', sad: 'ص', ra: 'ر' };
    for (const word of [...lab.words, ...lab.pairs.flatMap((p) => p.words)]) {
      expect(word.uthmani.slice(...word.focus.uthmani)[0], word.key).toBe(
        sign[word.letter]
      );
      expect(word.indopak.slice(...word.focus.indopak)[0], word.key).toBe(
        sign[word.letter]
      );
    }
  });

  it('read heavy and light from the vowel on the rāʾ', () => {
    const weight = (key: string) => lab.words.find((w) => w.key === key)?.weight;
    expect(weight('hafs:1:2:3')).toBe('heavy'); // rabbi
    expect(weight('hafs:2:22:16')).toBe('light'); // rizqan
  });

  it('say which pair differs in one letter only', () => {
    expect(lab.pairs[0]).toMatchObject({ letters: ['sin', 'sad'], exact: true });
    expect(lab.pairs.some((p) => !p.exact)).toBe(true);
  });

  it('refuse a pick that is not timed as a word of its own', () => {
    expect(() => buildLab(shipped, { ayat: {} })).toThrow(/not timed/);
  });
});
