import { describe, expect, it } from 'vitest';
import { detect } from '../src/index';
import { IZHAR_EXCEPTIONS, SHEET_FIXTURES } from './sheet.fixtures';

const rules = (text: string) => detect(text).map((o) => o.rule);

describe('the sheet', () => {
  it.each(SHEET_FIXTURES)('$text: $expectedRule', ({ text, expectedRule, all }) => {
    expect(rules(text)).toEqual(all ?? [expectedRule]);
  });

  it.each(IZHAR_EXCEPTIONS)('$text keeps iẓhār inside one word', ({ text }) => {
    expect(rules(text)).toEqual(['izhar']);
  });

  it('merges the same letters across two words', () => {
    expect(rules('مَنْ يَقُولُ')).toEqual(['idgham-ghunna']);
    expect(rules('مِنْ وَالٍ')).toEqual(['idgham-ghunna']);
  });
});

describe('detect', () => {
  it('spans the carrier and the letter that decides', () => {
    const text = 'مِنْ بَعْدِ';
    const [iqlab] = detect(text);
    expect(iqlab).toMatchObject({ rule: 'iqlab', follower: 'ب' });
    expect(text.slice(iqlab!.start, iqlab!.end)).toBe('نْ بَ');
  });

  it('reads ʿUthmānī spelling: a bare nūn, the small mīm, the shadda of the idghām', () => {
    expect(rules('مِن تَابَ')).toEqual(['ikhfa']);
    expect(rules('مِنۢ بَعْدِ')).toEqual(['iqlab']);
    expect(rules('سَمِيعُۢ بَصِيرٌ')).toEqual(['iqlab']);
    expect(rules('مِن مَّآءٍ')).toEqual(['idgham-ghunna']);
    expect(rules('لَكُم مَّا')).toEqual(['idgham-shafawi']);
  });

  it('skips the silent seat of fatḥatān', () => {
    expect(rules('عَلِيمًا حَكِيمًا')).toEqual(['izhar']);
    expect(rules('هُدًى لِّلْمُتَّقِينَ')).toEqual(['idgham-no-ghunna']);
  });

  it('stops at an āya sign and where a vowel is carried over alif waṣla', () => {
    expect(rules('مِنْ ۝ بَعْدِ')).toEqual([]);
    expect(rules('خَيْرًا ٱلْوَصِيَّةُ')).toEqual([]);
    // IndoPak writes alif waṣla as a bare alif.
    expect(rules('خَيْرًا الْوَصِيَّةُ')).toEqual([]);
    expect(rules('عَلِيمٌ الَّذِي')).toEqual([]);
    expect(rules('مِنَ ٱللَّهِ')).toEqual([]);
  });

  it('reads a bare alif with a vowel as hamza (IndoPak spelling)', () => {
    expect(rules('عَذَابٌ اَلِيْمٌ')).toEqual(['izhar']);
  });

  it('finds the ghunna of a mushaddad nūn or mīm', () => {
    expect(rules('إِنَّ')).toEqual(['ghunna-mushaddad']);
    expect(rules('ثُمَّ')).toEqual(['ghunna-mushaddad']);
  });

  it('finds qalqala on a sākin quṭbu jadd letter', () => {
    expect(rules('لَمْ يَلِدْ وَلَمْ يُولَدْ')).toEqual([
      'izhar-shafawi',
      'qalqala',
      'izhar-shafawi',
      'qalqala',
    ]);
    expect(rules('اقْرَأْ')).toEqual(['qalqala']);
  });

  it('finds nothing in a word without these rules', () => {
    expect(rules('قُلْ هُوَ اللَّهُ أَحَدٌ')).toEqual([]);
  });
});
