import { describe, expect, it } from 'vitest';
import { reciterOf, recordingOf } from '@/modules/mushaf/reciters';
import { wordsAt } from '@/modules/mushaf/timings';

describe('the recordings and their timings', () => {
  it('names EveryAyah’s file of an āya, the basmala as al-Fātiḥa 1', () => {
    const husary = reciterOf('husary');
    expect(recordingOf(husary, 2, 255)).toEqual({
      src: 'https://everyayah.com/data/Husary_64kbps/002255.mp3',
      start: 0,
    });
    expect(recordingOf(husary, 87, 0)?.src).toBe(
      'https://everyayah.com/data/Husary_64kbps/001001.mp3'
    );
  });

  it('finds an āya in its sūra’s file by its span, the basmala before the first', () => {
    const maher = reciterOf('maher');
    const spans = { '87:1': [7930, 11940], '87:2': [13010, 16740] } as const;
    const file =
      'https://download.quranicaudio.com/quran/maher_almu3aiqly/year1440/087.mp3';
    expect(recordingOf(maher, 87, 2, spans)).toEqual({
      src: file,
      start: 13010,
      end: 16740,
    });
    expect(recordingOf(maher, 87, 0, spans)).toEqual({ src: file, start: 0, end: 7930 });
    // Without its timings a sūra's file says nothing about where the āya is.
    expect(recordingOf(maher, 87, 2)).toBeNull();
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
