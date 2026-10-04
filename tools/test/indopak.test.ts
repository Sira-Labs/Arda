import type { PackSpan } from '@arda/quran';
import { describe, expect, it } from 'vitest';
import { alignLetters, carrySpans, lettersOf } from '../src/carry';
import { parseIndopak } from '../src/indopak';

/** A DigitalKhatt file of the given pages (lines as printed). */
const file = (pages: string[][]) =>
  `let quranText = [\n${pages
    .map((lines) => `  [\n${lines.map((l) => `    '${l}',`).join('\n')}\n  ],`)
    .join('\n')}\n]\nexport { quranText };\n`;

const RLO = String.fromCharCode(0x202e);

describe('the DigitalKhatt IndoPak text', () => {
  it('reads sūras, basmala and āyāt with their page and line', () => {
    const text = parseIndopak(
      file([
        [
          'سُورَةُ الفَاتِحَةِ',
          'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ ۝',
          'اَلْحَمْدُ لِلّٰهِ ۝١ۙ الرَّحْمٰنِ ۝٢ۙ',
          'مٰلِكِ ۝٣ؕ اِيَّاكَ ۝٤ؕ اِهْدِنَا ۝٥ۙ',
        ],
        [
          `صِرَاطَ عَلَيْهِمْ${RLO}٦ۙ غَيْرِ الضَّالِّيْنَ ۝٧ࣖ`,
          'سُورَةُ البَقَرَةِ',
          'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ ۝',
          'الٓمّٓ ۝١ ذٰلِكَ الْكِتٰبُ',
          'لَا رَيْبَ ۝٢',
        ],
      ]),
      { partial: true }
    );
    const [fatiha, baqara] = text.suras;
    // Al-Fātiḥa: the basmala is āya 1 (Ḥafṣ), and the source's 6 and 7 are āya 7.
    expect(fatiha!.ayat.map((a) => a.map((w) => w.text).join(' '))).toEqual([
      'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ',
      'اَلْحَمْدُ لِلّٰهِ',
      'الرَّحْمٰنِ',
      'مٰلِكِ',
      'اِيَّاكَ',
      'اِهْدِنَا',
      'صِرَاطَ عَلَيْهِمْ غَيْرِ الضَّالِّيْنَ',
    ]);
    // The number printed inside the word is cut off it and kept after it.
    expect(fatiha!.ayat[6]![1]).toEqual({
      text: 'عَلَيْهِمْ',
      page: 2,
      line: 1,
      after: `${RLO}٦ۙ`,
    });
    expect(baqara!.heading).toEqual({ text: 'سُورَةُ البَقَرَةِ', page: 2, line: 2 });
    expect(baqara!.basmala?.map((w) => w.text)).toHaveLength(4);
    // An āya across lines keeps each word's line; the marker hangs on the last word.
    expect(baqara!.ayat[1]!.map((w) => [w.text, w.line, w.after])).toEqual([
      ['ذٰلِكَ', 4, ''],
      ['الْكِتٰبُ', 4, ''],
      ['لَا', 5, ''],
      ['رَيْبَ', 5, '۝٢'],
    ]);
  });

  it('refuses āyāt out of order and words without an end', () => {
    const heading = ['سُورَةُ البَقَرَةِ', 'بِسْمِ اللّٰهِ ۝'];
    expect(() =>
      parseIndopak(file([['سُورَةُ الفَاتِحَةِ', ...heading.slice(1)]]))
    ).toThrow(/sūras/);
    expect(() =>
      parseIndopak(file([['سُورَةُ الفَاتِحَةِ', 'بِسْمِ ۝', 'اَلْحَمْدُ ۝٢']]), {
        partial: true,
      })
    ).toThrow(/out of order/);
    expect(() =>
      parseIndopak(file([['سُورَةُ الفَاتِحَةِ', 'بِسْمِ ۝', 'اَلْحَمْدُ']]), {
        partial: true,
      })
    ).toThrow(/after the last āya/);
  });
});

/** Rule and the text it covers, for each span. */
const shown = (
  word: string,
  spans: readonly (readonly [number, number, string, ...unknown[]])[]
) => spans.map(([s, e, rule]) => `${rule}=${word.slice(s, e)}`);

describe('carrying rules to the IndoPak spelling', () => {
  it('matches letters, not offsets, and keeps marks that stand for a letter', () => {
    const salah = 'ٱلصَّلَوٰةَ';
    const spans: PackSpan[] = [
      [0, 1, 'hamzat_wasl'],
      [1, 2, 'lam_shamsiyyah'],
      [7, 8, 'silent'],
      [8, 9, 'madd_2'],
    ];
    expect(shown(salah, spans)).toEqual([
      'hamzat_wasl=ٱ',
      'lam_shamsiyyah=ل',
      'silent=و',
      'madd_2=ٰ',
    ]);
    // IndoPak writes the small alif before the wāw: the two are matched across.
    const carried = carrySpans(salah, 'الصَّلٰوةَ', spans);
    expect(carried.misses).toEqual([]);
    expect(shown('الصَّلٰوةَ', carried.spans)).toEqual([
      'hamzat_wasl=ا',
      'lam_shamsiyyah=ل',
      'silent=و',
      'madd_2=ٰ',
    ]);
  });

  it('carries the small yāʾ and wāw onto the IndoPak standing kasra and ḍamma', () => {
    const yaa = carrySpans('بِهِۦ', 'بِهٖ', [[4, 5, 'madd_2']]);
    expect(shown('بِهٖ', yaa.spans)).toEqual(['madd_2=ٖ']);
    const waw = carrySpans('إِنَّهُۥ', 'اِنَّهٗ', [[7, 8, 'madd_2']]);
    expect(shown('اِنَّهٗ', waw.spans)).toEqual(['madd_2=ٗ']);
  });

  it('keeps the follower mark of a rule decided by the next letter', () => {
    const carried = carrySpans('مِن', 'مِنْ', [[0, 2, 'ikhfa', 'f']]);
    expect(carried.spans).toEqual([[0, 2, 'ikhfa', 'f']]);
  });

  it('reports a rule whose letter the other spelling does not have', () => {
    // A madd on the small alif of كِتَٰب, carried to a spelling without that alif.
    const carried = carrySpans('كِتَٰب', 'كِتَب', [[4, 5, 'madd_2']]);
    expect(carried.spans).toEqual([]);
    expect(carried.misses).toHaveLength(1);
  });

  it('aligns two neighbours written the other way round as one edit', () => {
    const to = alignLetters(lettersOf('عَلَىٰٓ'), lettersOf('عَلٰٓي'));
    expect(to).toEqual([0, 1, 3, 2]);
  });
});
