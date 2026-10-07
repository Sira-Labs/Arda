import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Pack, PackIndex } from '@arda/quran';
import { SHEET_EXAMPLES, UNIT_EXAMPLES } from '@arda/tajweed';

const web = (path: string) =>
  fileURLToPath(new URL(`../../apps/web/${path}`, import.meta.url));
const index = JSON.parse(
  readFileSync(web('public/packs/index.json'), 'utf8')
) as PackIndex;
const packs = index.packs
  .filter((entry) => entry.id.startsWith('uthmani'))
  .map(
    (entry) => JSON.parse(readFileSync(web(`public/packs/${entry.file}`), 'utf8')) as Pack
  );

/** The word at a key in the ʿUthmānī packs (Tanzil's text). */
function wordAt(key: string): string | undefined {
  const [, sura, aya, n] = key.split(':').map(Number);
  for (const pack of packs) {
    const ayat = pack.suras.find((s) => s.sura === sura)?.ayat;
    const word = ayat?.find((a) => a.aya === aya)?.words[(n as number) - 1];
    if (word) return word.t;
  }
  return undefined;
}

/** Letters only: the examples are spelt like the sheet, the packs like the muṣḥaf. */
const skeleton = (text: string) =>
  text
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{Lo}]|ـ/gu, '');

describe('the examples of units 2–4 are real words (spec 03 §4)', () => {
  const keyed = [...SHEET_EXAMPLES, ...UNIT_EXAMPLES].filter((e) => e.wordKey);
  it.each(keyed.map((e) => [e.wordKey!, e.text] as const))('%s is %s', (key, text) => {
    const word = wordAt(key);
    expect(word, `no word at ${key} in the packs`).toBeDefined();
    expect(skeleton(word!)).toBe(skeleton(text.split(' ')[0]!));
  });
});
