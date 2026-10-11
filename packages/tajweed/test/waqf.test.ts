import { describe, expect, it } from 'vitest';
import { RULES, WAQF_RULES, WAQF_SIGNS, detect, waqfSignOf } from '../src/index';

/** What the stop and the start make of a text: each rule with the letter it marks. */
const waqf = (text: string) =>
  detect(text, { waqf: true }).map((o) => [o.rule, text.slice(o.start, o.carrierEnd)]);

describe('stopping (unit 7)', () => {
  it('is found only when asked, so the earlier units see the same occurrences', () => {
    expect(detect('نَسْتَعِينُ')).toEqual([]);
    expect(waqf('نَسْتَعِينُ')).toEqual([
      ['madd-arid', 'ي'],
      ['waqf-sukun', 'نُ'],
    ]);
  });

  it('ends on sukūn, fatḥatān on a long ā, tāʾ marbūṭa on hāʾ', () => {
    expect(waqf('أَحَدٌ')).toEqual([
      ['waqf-sukun', 'دٌ'],
      ['qalqala', 'دٌ'],
    ]);
    expect(waqf('عَلِيمًا')).toEqual([['madd-iwad', 'مً']]);
    expect(waqf('هُدًى')).toEqual([['madd-iwad', 'دً']]);
    expect(waqf('رَحْمَةٌ')).toEqual([['waqf-ha', 'ةٌ']]);
    // The ṣila of the hāʾ is dropped; a long vowel at the end stays as it is.
    expect(waqf('بِهِۦ')).toEqual([['waqf-sukun', 'هِۦ']]);
    expect(waqf('قَالُوا۟')).toEqual([]);
  });

  it('makes a madd letter before the last one ʿāriḍ, and wāw or yāʾ after fatḥa līn', () => {
    expect(waqf('ٱلْمُسْتَقِيمَ')).toContainEqual(['madd-arid', 'ي']);
    expect(waqf('غَفُورٌ')).toContainEqual(['madd-arid', 'و']);
    expect(waqf('بِٱلْوَادِ')).toContainEqual(['madd-arid', 'ا']);
    expect(waqf('قُرَيْشٍ')).toContainEqual(['madd-lin', 'يْ']);
    expect(waqf('خَوْفٍ')).toContainEqual(['madd-lin', 'وْ']);
    // Before a final hamza the madd stays joined (muttaṣil).
    expect(waqf('ٱلسَّمَآءِ').map(([rule]) => rule)).not.toContain('madd-arid');
    expect(RULES['madd-arid'].counts).toEqual([2, 6]);
  });

  it('bounces on a qalqala letter at the end, also with shadda', () => {
    expect(waqf('ٱلْفَلَقِ')).toContainEqual(['qalqala', 'قِ']);
    expect(waqf('ٱلْحَقُّ')).toContainEqual(['qalqala', 'قُّ']);
  });

  it('reads a rāʾ at a stop by what is before it', () => {
    const ra = (text: string) =>
      detect(text, { waqf: true, tafkhim: true })
        .filter((o) => o.rule.startsWith('ra-'))
        .map((o) => [o.rule, o.reason]);
    expect(ra('ٱلْقَدْرِ')).toEqual([['ra-heavy', 'stop-after-fatha']]);
    expect(ra('غَفُورٌ')).toEqual([['ra-heavy', 'stop-after-damma']]);
    expect(ra('حِجْرٍ')).toEqual([['ra-light', 'stop-after-kasra']]);
    expect(ra('خَبِيرٌ')).toEqual([['ra-light', 'stop-after-ya']]);
    // Joined, the same rāʾ has its own vowel.
    expect(
      detect('ٱلْقَدْرِ', { tafkhim: true })
        .filter((o) => o.rule.startsWith('ra-'))
        .map((o) => [o.rule, o.reason])
    ).toEqual([['ra-light', 'kasra']]);
  });

  it('replaces the joined madd ṭabīʿī with ʿāriḍ on the same letter', () => {
    const rules = detect('ٱلرَّحِيمِ', { waqf: true, madd: true }).map((o) => o.rule);
    expect(rules).toContain('madd-arid');
    expect(rules).not.toContain('madd-tabii');
  });
});

describe('starting (ibtidāʾ)', () => {
  const start = (text: string) =>
    detect(text, { waqf: true }).find((o) => o.rule.startsWith('ibtida'))?.rule;

  it('begins the article with fatḥa', () => {
    expect(start('ٱلْحَمْدُ')).toBe('ibtida-fatha');
    expect(start('ٱلَّذِى')).toBe('ibtida-fatha');
    expect(start('ٱلْـَٔاخِرَةِ')).toBe('ibtida-fatha');
    expect(start('ٱللَّهُ')).toBe('ibtida-fatha');
  });

  it('begins with ḍamma where the third letter has an original ḍamma', () => {
    expect(start('ٱنظُرْ')).toBe('ibtida-damma');
    expect(start('ٱدْعُ')).toBe('ibtida-damma');
    expect(start('ٱتُّبِعُوا۟')).toBe('ibtida-damma');
  });

  it('begins with kasra otherwise, and in the nouns', () => {
    expect(start('ٱرْجِعِىٓ')).toBe('ibtida-kasra');
    expect(start('ٱهْدِنَا')).toBe('ibtida-kasra');
    expect(start('ٱتَّقُوا۟')).toBe('ibtida-kasra');
    expect(start('ٱمْشُوا۟')).toBe('ibtida-kasra');
    expect(start('ٱسْمُهُۥ')).toBe('ibtida-kasra');
    expect(start('ٱبْنُ')).toBe('ibtida-kasra');
  });

  it('is only at the start of the text', () => {
    expect(start('بِسْمِ ٱللَّهِ')).toBeUndefined();
  });
});

describe('the signs of the muṣḥaf', () => {
  it('name the six pause signs and sakta', () => {
    expect(WAQF_SIGNS.map((s) => s.id)).toEqual([
      'lazim',
      'mamnu',
      'jaiz',
      'wasl-awla',
      'waqf-awla',
      'muanaqa',
      'sakta',
    ]);
    expect(waqfSignOf('ۘ')?.id).toBe('lazim');
    expect(waqfSignOf('ب')).toBeUndefined();
  });

  it('keep the stop rules apart from the colours of the muṣḥaf', () => {
    for (const id of WAQF_RULES) expect(RULES[id].subject).toBe('waqf');
  });
});
