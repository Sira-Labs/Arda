import { describe, expect, it } from 'vitest';
import { SURAS, isAyaRange, sura } from '../src/index';

describe('the sūra index', () => {
  it('has 114 sūras and 6236 āyāt (Ḥafṣ, Kūfan count)', () => {
    expect(SURAS).toHaveLength(114);
    expect(SURAS.reduce((sum, s) => sum + s.ayas, 0)).toBe(6236);
    expect(SURAS.map((s) => s.number)).toEqual(
      Array.from({ length: 114 }, (_, i) => i + 1)
    );
  });

  it('knows the sūras the sheikh starts with', () => {
    expect(sura(1)).toEqual({ number: 1, name: 'الفاتحة', ayas: 7 });
    expect(sura(2)?.ayas).toBe(286);
    expect(sura(36)?.name).toBe('يس');
    expect(sura(67)?.ayas).toBe(30);
    expect(sura(114)).toEqual({ number: 114, name: 'الناس', ayas: 6 });
  });

  it('has no sūra 0, 115 or 2.5', () => {
    expect(sura(0)).toBeUndefined();
    expect(sura(115)).toBeUndefined();
    expect(sura(2.5)).toBeUndefined();
  });
});

describe('āya ranges', () => {
  it('accept ranges inside one sūra', () => {
    expect(isAyaRange({ sura: 1, from: 1, to: 7 })).toBe(true);
    expect(isAyaRange({ sura: 2, from: 255, to: 255 })).toBe(true);
    expect(isAyaRange({ sura: 114, from: 1, to: 6 })).toBe(true);
  });

  it('refuse ranges that are not in the muṣḥaf', () => {
    expect(isAyaRange({ sura: 1, from: 1, to: 8 })).toBe(false);
    expect(isAyaRange({ sura: 1, from: 0, to: 3 })).toBe(false);
    expect(isAyaRange({ sura: 2, from: 5, to: 4 })).toBe(false);
    expect(isAyaRange({ sura: 115, from: 1, to: 1 })).toBe(false);
    expect(isAyaRange({ sura: 2, from: 1.5, to: 3 })).toBe(false);
  });
});
