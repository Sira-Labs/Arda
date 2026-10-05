import { describe, expect, it } from 'vitest';
import { ayaAudio, reciterOf } from '@/modules/mushaf/reciters';
import { wordsAt } from '@/modules/mushaf/timings';

describe('the recordings and their timings', () => {
  it('names EveryAyah’s file of an āya, the basmala as al-Fātiḥa 1', () => {
    const maher = reciterOf('maher');
    expect(ayaAudio(maher, 2, 255)).toBe(
      'https://everyayah.com/data/MaherAlMuaiqly128kbps/002255.mp3'
    );
    expect(ayaAudio(maher, 87, 0)).toBe(
      'https://everyayah.com/data/MaherAlMuaiqly128kbps/001001.mp3'
    );
  });

  it('finds the words being recited, and none between them', () => {
    const segments = [
      [0, 1, 0, 1000],
      [1, 3, 1010, 2000],
      [3, 4, 5000, 6000],
    ] as const;
    expect(wordsAt(segments, 500)).toEqual({ from: 1, to: 1 });
    expect(wordsAt(segments, 1500)).toEqual({ from: 2, to: 3 });
    // The teaching recitation's pause for the student to repeat.
    expect(wordsAt(segments, 3000)).toBeUndefined();
    expect(wordsAt(undefined, 500)).toBeUndefined();
  });
});
