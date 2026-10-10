import { describe, expect, it } from 'vitest';
import { RULES, WEIGHT_RULES, detect, isWeightRule } from '../src/index';

/** The heavy and light letters found, each with its reason and the text it colours. */
const weights = (text: string) =>
  detect(text, { tafkhim: true })
    .filter((o) => isWeightRule(o.rule) && o.rule !== 'tafkhim')
    .map((o) => [o.rule, o.reason, text.slice(o.start, o.carrierEnd)]);

describe('heavy and light letters (unit 6)', () => {
  it('are found only when asked, so the earlier units see the same occurrences', () => {
    const text = 'رَسُولُ ٱللَّهِ';
    expect(detect(text)).toEqual([]);
    expect(detect(text, { tafkhim: true }).map((o) => o.rule)).toEqual([
      'ra-heavy',
      'lam-heavy',
    ]);
  });

  it('mark the seven letters of istiʿlāʾ heavy wherever they are', () => {
    expect(RULES.tafkhim.letters).toEqual(['خ', 'ص', 'ض', 'غ', 'ط', 'ق', 'ظ']);
    const text = 'ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ';
    const heavy = detect(text, { tafkhim: true }).filter((o) => o.rule === 'tafkhim');
    expect(heavy.map((o) => text.slice(o.start, o.carrierEnd))).toEqual([
      'صِّ',
      'طَ',
      'قِ',
    ]);
  });

  it('read the lām of Allāh heavy after fatḥa or ḍamma, and at the start', () => {
    expect(weights('قَالَ ٱللَّهُ')).toEqual([['lam-heavy', 'after-fatha', 'لَّ']]);
    expect(weights('وَٱللَّهُ')).toEqual([['lam-heavy', 'after-fatha', 'لَّ']]);
    expect(weights('إِلَى ٱللَّهِ')).toEqual([['lam-heavy', 'after-fatha', 'لَّ']]);
    // The wāw and the silent alif of the plural are passed over.
    expect(weights('قَالُوا۟ ٱللَّهُ')).toEqual([['lam-heavy', 'after-damma', 'لَّ']]);
    expect(weights('ٱللَّهُ')).toEqual([['lam-heavy', 'start', 'لَّ']]);
    expect(weights('ٱللَّهُمَّ')).toEqual([['lam-heavy', 'start', 'لَّ']]);
  });

  it('read it light after kasra, also the kasra of a tanwīn before alif waṣla', () => {
    expect(weights('بِسْمِ ٱللَّهِ')).toEqual([['lam-light', 'after-kasra', 'لَّ']]);
    expect(weights('بِٱللَّهِ')).toEqual([['lam-light', 'after-kasra', 'لَّ']]);
    expect(weights('لِلَّهِ')).toEqual([['lam-light', 'after-kasra', 'لَّ']]);
    expect(weights('فِى ٱللَّهِ')).toEqual([['lam-light', 'after-kasra', 'لَّ']]);
    expect(weights('أَحَدٌ ٱللَّهُ')).toEqual([['lam-light', 'after-kasra', 'لَّ']]);
    // The first lām of لِّلَّهِ has a shadda of its own; the lām before the hāʾ is the one.
    expect(weights('قُل لِّلَّهِ')).toEqual([['lam-light', 'after-kasra', 'لَّ']]);
  });

  it('leave other words with a doubled lām alone', () => {
    expect(weights('ٱللَّهْوِ')).toEqual([]);
    expect(weights('لَعَلَّهُمْ')).toEqual([]);
    expect(weights('لَّهُمْ')).toEqual([]);
  });

  it('read a vowelled rāʾ by its own vowel', () => {
    expect(weights('رَبِّ')).toEqual([['ra-heavy', 'fatha', 'رَ']]);
    expect(weights('رُزِقُوا۟')).toEqual([['ra-heavy', 'damma', 'رُ']]);
    expect(weights('خَيْرٌ')).toEqual([['ra-heavy', 'damma', 'رٌ']]);
    expect(weights('رِجَالٌ')).toEqual([['ra-light', 'kasra', 'رِ']]);
    expect(weights('وَٱلْفَجْرِ')).toEqual([['ra-light', 'kasra', 'رِ']]);
  });

  it('read a rāʾ sākina by the vowel before it in its word', () => {
    expect(weights('مَرْيَمَ')).toEqual([['ra-heavy', 'after-fatha', 'رْ']]);
    expect(weights('ٱلْقُرْءَانُ')).toEqual([['ra-heavy', 'after-damma', 'رْ']]);
    expect(weights('فِرْعَوْنَ')).toEqual([['ra-light', 'after-kasra', 'رْ']]);
    expect(weights('أَنذِرْ')).toEqual([['ra-light', 'after-kasra', 'رْ']]);
  });

  it('keep a rāʾ sākina heavy after hamzat al-waṣl and before a heavy letter', () => {
    expect(weights('ٱرْجِعِىٓ')).toEqual([['ra-heavy', 'after-wasla', 'رْ']]);
    expect(weights('رَبِّ ٱرْحَمْهُمَا')[1]).toEqual(['ra-heavy', 'after-wasla', 'رْ']);
    const [mirsad] = detect('مِرْصَادًا', { tafkhim: true }).filter(
      (o) => o.rule === 'ra-heavy'
    );
    expect(mirsad).toMatchObject({ reason: 'before-heavy', follower: 'ص' });
  });

  it('read a rāʾ merged into the next one only once', () => {
    expect(weights('وَٱذْكُر رَّبَّكَ')).toEqual([['ra-heavy', 'fatha', 'رَّ']]);
  });

  it('colour the heavy rules and leave the light ones clear', () => {
    expect(WEIGHT_RULES.map((id) => [id, RULES[id].family, RULES[id].weight])).toEqual([
      ['tafkhim', 'tafkhim', 'heavy'],
      ['lam-heavy', 'tafkhim', 'heavy'],
      ['lam-light', null, 'light'],
      ['ra-heavy', 'tafkhim', 'heavy'],
      ['ra-light', null, 'light'],
    ]);
  });
});
