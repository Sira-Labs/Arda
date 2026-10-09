import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { detect } from '@arda/tajweed';
import { describe, expect, it } from 'vitest';
import {
  CARD_EXAMPLES,
  cardAudioModule,
  serialiseCardAudio,
  skeleton,
  timedSpan,
  type CardAudioData,
} from '../src/cardAudio';
import { joinsNasal } from '../src/lab';

const file = fileURLToPath(new URL('../card-audio.json', import.meta.url));
const moduleFile = fileURLToPath(
  new URL('../../apps/web/src/content/cardAudio.ts', import.meta.url)
);
const data = JSON.parse(readFileSync(file, 'utf8')) as CardAudioData;

describe('the rule cards’ examples in the Qurʾān', () => {
  it('finds every example but the ones the Qurʾān does not have', () => {
    const heard = data.examples.map((e) => e.text);
    expect([...heard, ...data.missing].sort()).toEqual(
      [...new Set(CARD_EXAMPLES.map((e) => e.text))].sort()
    );
    // The sheet's iẓhār shafawī example is a phrase, not a quotation.
    expect(data.missing).toEqual(['عَلَيْهِمْ سَلَامٌ']);
  });

  it('keeps only places with the example’s letters and the card’s rule, heard on their own', () => {
    for (const e of data.examples) {
      const words = e.uthmani.split(' ');
      expect(words.map(skeleton).join(' '), e.text).toBe(
        e.text.split(' ').map(skeleton).join(' ')
      );
      expect(e.to - e.from + 1, e.text).toBe(words.length);
      expect(
        detect(e.uthmani).map((o) => o.rule),
        e.text
      ).toContain(e.rule);
      if (e.before !== null) expect(joinsNasal(e.before, words[0]!), e.text).toBe(false);
      // Measured in the sound: the clip only ever grows around the timing.
      expect(e.clip[0], e.text).toBeLessThanOrEqual(e.timed[0]);
      expect(e.clip[1], e.text).toBeGreaterThanOrEqual(e.timed[1]);
      expect(e.clip[1] - e.clip[0], e.text).toBeLessThan(8000);
    }
    // The sheet's own word keys win: al-Fātiḥa 7 for anʿamta, al-Fīl 4 for tarmīhim.
    const at = (text: string) => data.examples.find((e) => e.text === text);
    expect(at('أَنْعَمْتَ')).toMatchObject({ sura: 1, aya: 7, from: 3 });
    expect(at('تَرْمِيهِمْ بِحِجَارَةٍ')).toMatchObject({ sura: 105, aya: 4, from: 1 });
  });

  it('reads letters past spelling: alif, hamza seats and the small alif', () => {
    expect(skeleton('مِنْ دِيَارِهِمْ')).toBe(skeleton('مِن دِيَٰرِهِمْ'));
    expect(skeleton('آمَنَ')).toBe(skeleton('ءَامَنَ'));
    expect(skeleton('مَاءٍ')).toBe(skeleton('مَّآءٍ'));
    expect(skeleton('مِنْ')).toBe(skeleton('مَن'));
  });

  it('times a span only when no segment runs over its edges', () => {
    const timings = {
      ayat: {
        '1:1': [
          [0, 1, 0, 500],
          [1, 3, 500, 1500],
          [3, 4, 1500, 2000],
        ],
      },
    };
    expect(timedSpan(timings, 1, 1, 2, 3)).toEqual({ timed: [500, 1500], last: false });
    expect(timedSpan(timings, 1, 1, 3, 4)).toBeNull();
    expect(timedSpan(timings, 1, 1, 4, 4)).toEqual({ timed: [1500, 2000], last: true });
  });

  it('is written as generated', () => {
    expect(serialiseCardAudio(data)).toBe(readFileSync(file, 'utf8'));
    expect(cardAudioModule(data)).toBe(readFileSync(moduleFile, 'utf8'));
  });
});
