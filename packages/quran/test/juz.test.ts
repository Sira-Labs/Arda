import { describe, expect, it } from 'vitest';
import { JUZ_NAMES, JUZ_STARTS, juzOf } from '../src/index';

describe('the ajzāʾ', () => {
  it('has thirty, each named and in order', () => {
    expect(JUZ_STARTS).toHaveLength(30);
    expect(JUZ_NAMES).toHaveLength(30);
    JUZ_STARTS.forEach(([sura, aya], i) => expect(juzOf(sura, aya)).toBe(i + 1));
  });

  it('gives an āya the juzʾ it falls in', () => {
    expect(juzOf(1, 7)).toBe(1);
    expect(juzOf(2, 141)).toBe(1);
    expect(juzOf(2, 142)).toBe(2);
    expect(juzOf(2, 286)).toBe(3);
    expect(juzOf(78, 1)).toBe(30);
    expect(juzOf(114, 6)).toBe(30);
  });
});
