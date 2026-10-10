import { describe, expect, it } from 'vitest';
import { MADD_RULES, RULES, detect, isMaddRule } from '../src/index';

/** The madd rules found, each with the text it colours. */
const madd = (text: string) =>
  detect(text, { madd: true })
    .filter((o) => isMaddRule(o.rule))
    .map((o) => [o.rule, text.slice(o.start, o.carrierEnd)]);

describe('madd (unit 5)', () => {
  it('is found only when asked, so units 2–4 see the same occurrences', () => {
    const text = 'إِنَّآ أَعْطَيْنَٰكَ';
    expect(detect(text).map((o) => o.rule)).toEqual(['ghunna-mushaddad']);
    expect(detect(text, { madd: true }).map((o) => o.rule)).toEqual([
      'ghunna-mushaddad',
      'madd-munfasil',
      'madd-tabii',
    ]);
  });

  it('is natural on a madd letter with nothing after it that lengthens it', () => {
    expect(madd('قَالَ')).toEqual([['madd-tabii', 'ا']]);
    expect(madd('يَقُولُونَ')).toEqual([
      ['madd-tabii', 'و'],
      ['madd-tabii', 'و'],
    ]);
    expect(madd('فِيهِ')).toEqual([['madd-tabii', 'ي']]);
    // The small alif, and the ṣila of the hāʾ.
    expect(madd('هَٰذَا')).toEqual([
      ['madd-tabii', 'هَٰ'],
      ['madd-tabii', 'ا'],
    ]);
    expect(madd('لَهُۥ')).toEqual([['madd-tabii', 'هُۥ']]);
    expect(madd('إِبْرَٰهِـۧمَ')).toEqual([
      ['madd-tabii', 'رَٰ'],
      ['madd-tabii', 'هِـۧ'],
    ]);
  });

  it('is joined before a hamza in the same word', () => {
    // The muṣḥaf's alif with the madda sign, the precomposed alif madda, and plain spelling.
    expect(madd('ٱلسَّمَا\u0653ءِ')).toEqual([['madd-muttasil', 'ا\u0653']]);
    expect(madd('ٱلسَّمَ\u0622ءِ')).toEqual([['madd-muttasil', '\u0622']]);
    expect(madd('جَاءَ')).toEqual([['madd-muttasil', 'ا']]);
    // The hamza on a tatweel, and after a silent alif.
    expect(madd('خَطِيٓـَٔتُهُۥ')[0]).toEqual(['madd-muttasil', 'يٓـَٔ']);
    expect(madd('وَجِا۟ىٓءَ')).toEqual([['madd-muttasil', 'ىٓ']]);
  });

  it('is separated where the next word starts with a hamza', () => {
    expect(madd('بِمَا أُنزِلَ')).toEqual([['madd-munfasil', 'ا']]);
    expect(madd('فِىٓ أَنفُسِكُمْ')).toEqual([['madd-munfasil', 'ىٓ']]);
    const separated = detect('قَالُوٓا۟ ءَامَنَّا', { madd: true }).find(
      (o) => o.rule === 'madd-munfasil'
    );
    expect(separated).toMatchObject({
      rule: 'madd-munfasil',
      follower: 'ء',
      acrossWords: true,
    });
  });

  it('is separated after the vocative yā and the hā of attention (munfaṣil ḥukmī)', () => {
    expect(madd('يَٰٓأَيُّهَا')[0]).toEqual(['madd-munfasil', 'يَٰٓ']);
    expect(madd('هَٰٓؤُلَآءِ')).toEqual([
      ['madd-munfasil', 'هَٰٓ'],
      ['madd-muttasil', 'آ'],
    ]);
    expect(madd('يَٰٓـَٔادَمُ')[0]).toEqual(['madd-munfasil', 'يَٰٓـَٔ']);
  });

  it('is necessary before a shadda or sukūn in the same word', () => {
    const text = 'ٱلضَّآلِّينَ';
    const [lazim] = detect(text, { madd: true }).filter((o) => isMaddRule(o.rule));
    expect(lazim).toMatchObject({
      rule: 'madd-lazim',
      follower: 'ل',
      acrossWords: false,
    });
    expect(text.slice(lazim!.start, lazim!.end)).toBe('آلِّ');
    expect(madd('ٱلْحَآقَّةُ')[0]).toEqual(['madd-lazim', 'آ']);
  });

  it('is not read on a madd letter before alif waṣla', () => {
    expect(madd('فِى ٱلْأَرْضِ')).toEqual([]);
    expect(madd('قَالُوا۟ ٱلْحَقَّ')).toEqual([['madd-tabii', 'ا']]);
    // Spelling without ٱ: a bare alif starting a word or after a prefix is the waṣla.
    expect(madd('فِي الْأَرْضِ')).toEqual([]);
    expect(madd('وَالْأَرْضِ')).toEqual([]);
  });

  it('leaves līn, the silent letters and the seat of fatḥatān out', () => {
    expect(madd('شَىْءٍ')).toEqual([]);
    expect(madd('خَوْفٌ')).toEqual([]);
    expect(madd('عَلَيْهِمْ')).toEqual([]);
    expect(madd('عَلِيمًا')).toEqual([['madd-tabii', 'ي']]);
    expect(madd('أُو۟لَٰٓئِكَ')).toEqual([['madd-muttasil', 'لَٰٓ']]);
  });

  it('counts two for natural, four to five for the hamza, six for the necessary madd', () => {
    expect(MADD_RULES.map((id) => [id, RULES[id].counts])).toEqual([
      ['madd-tabii', [2, 2]],
      ['madd-muttasil', [4, 5]],
      ['madd-munfasil', [4, 5]],
      ['madd-lazim', [6, 6]],
    ]);
  });
});
