import { describe, expect, it } from 'vitest';
import { align } from '../src/align';
import type { Annotation } from '../src/cpfair';
import { parseCpfair } from '../src/cpfair';
import { parseTanzil } from '../src/tanzil';
import { splitWords } from '../src/words';

const COPYRIGHT = (year: number) =>
  `#  Tanzil Quran Text (Uthmani, Version 1.1)\n#  Copyright (C) 2007-${year} Tanzil Project`;

describe('the Tanzil text', () => {
  it('reads āyāt and keeps the copyright block', () => {
    const text = parseTanzil(
      `1|1|بِسْمِ ٱللَّهِ\n112|1|قُلْ هُوَ\n\n${COPYRIGHT(2026)}\n`
    );
    expect(text.ayat.get('112:1')).toBe('قُلْ هُوَ');
    expect(text.copyright).toContain('Tanzil Project');
  });

  it('pins the text, not the year in the copyright block', () => {
    const a = parseTanzil(`1|1|بِسْمِ\n${COPYRIGHT(2026)}`);
    const b = parseTanzil(`1|1|بِسْمِ\n${COPYRIGHT(2027)}`);
    const c = parseTanzil(`1|1|بِسْمُ\n${COPYRIGHT(2026)}`);
    expect(a.textSha256).toBe(b.textSha256);
    expect(a.textSha256).not.toBe(c.textSha256);
  });

  it('refuses a file without the copyright block, or with stray lines', () => {
    expect(() => parseTanzil('1|1|بِسْمِ\n')).toThrow(/copyright/);
    expect(() => parseTanzil(`not a line\n${COPYRIGHT(2026)}`)).toThrow(/unexpected/);
  });
});

describe('the cpfair annotations', () => {
  it('reads them per āya, in order', () => {
    const map = parseCpfair(
      JSON.stringify([
        {
          surah: 113,
          ayah: 2,
          annotations: [
            { rule: 'qalqalah', start: 18, end: 19 },
            { rule: 'ikhfa', start: 2, end: 6 },
          ],
        },
      ])
    );
    expect(map.get('113:2')?.map((a) => a.rule)).toEqual(['ikhfa', 'qalqalah']);
  });

  it('refuses unknown rules and empty spans', () => {
    const one = (annotation: object) =>
      JSON.stringify([{ surah: 1, ayah: 1, annotations: [annotation] }]);
    expect(() => parseCpfair(one({ rule: 'izhar', start: 0, end: 1 }))).toThrow(
      /unknown/
    );
    expect(() => parseCpfair(one({ rule: 'madd_2', start: 3, end: 3 }))).toThrow(
      /bad span/
    );
  });
});

describe('words', () => {
  it('splits on spaces and hangs pause and sajdah signs on the word before', () => {
    const text = [...'صَفًّا ۖ لَّا يَتَكَلَّمُونَ ۩'];
    const words = splitWords(text);
    expect(words.map((w) => [w.text, w.after])).toEqual([
      ['صَفًّا', 'ۖ'],
      ['لَّا', ''],
      ['يَتَكَلَّمُونَ', '۩'],
    ]);
    const start = text.indexOf('ل');
    expect(words[1]).toMatchObject({ start, end: start + [...'لَّا'].length });
  });
});

describe('re-aligning cpfair to the current Tanzil text', () => {
  // مِن شَرِّ مَا خَلَقَ (al-Falaq 2): ikhfāʾ on the nūn, qalqala on the qāf.
  const text = [...'مِن شَرِّ مَا خَلَقَ'];
  const ikhfa: Annotation = { rule: 'ikhfa', start: 2, end: 6 };
  const qalqala: Annotation = { rule: 'qalqalah', start: 18, end: 19 };

  it('keeps annotations that fit', () => {
    expect(align(text, [ikhfa, qalqala])).toEqual({
      annotations: [ikhfa, qalqala],
      moved: 0,
    });
  });

  it('moves annotations that drifted by a character or two', () => {
    const drifted = { ...qalqala, start: 16, end: 17 };
    expect(align(text, [ikhfa, drifted])).toEqual({
      annotations: [ikhfa, qalqala],
      moved: 1,
    });
  });

  it('gives a loose rule the shift of the strict one before it', () => {
    // Tanzil added a character before مَا: the qalqala and the madd of مَا drift together.
    const longer = [...'مِن شَرِّ ۖ مَا خَلَقَ'];
    const alif = longer.indexOf('ا');
    const qaf = longer.lastIndexOf('ق');
    const madd: Annotation = { rule: 'madd_2', start: alif - 2, end: alif - 1 };
    const drifted: Annotation = { rule: 'qalqalah', start: qaf - 2, end: qaf - 1 };
    const result = align(longer, [ikhfa, madd, drifted]);
    expect(result?.annotations.map((a) => longer[a.start])).toEqual(['ن', 'ا', 'ق']);
    expect(result?.moved).toBe(2);
  });

  it('gives up rather than guess', () => {
    expect(align(text, [{ rule: 'hamzat_wasl', start: 2, end: 3 }])).toBeNull();
  });
});
