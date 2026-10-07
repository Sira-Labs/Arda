import { describe, expect, it } from 'vitest';
import { detect, UNIT_EXAMPLES } from '../src';

describe('examples of units 3 and 4', () => {
  it.each(UNIT_EXAMPLES.map((e) => [e.text, e.expectedRule] as const))(
    '%s shows %s',
    (text, rule) => {
      expect(detect(text).map((o) => o.rule)).toContain(rule);
    }
  );

  it('names a qalqala word for each of ق ط ب ج د', () => {
    const letters = UNIT_EXAMPLES.filter((e) => e.expectedRule === 'qalqala').flatMap(
      (e) =>
        detect(e.text)
          .filter((o) => o.rule === 'qalqala')
          .map((o) => e.text.slice(o.start, o.start + 1))
    );
    expect(new Set(letters)).toEqual(new Set(['ق', 'ط', 'ب', 'ج', 'د']));
  });

  it('cites a word key for every example', () => {
    for (const e of UNIT_EXAMPLES) expect(e.wordKey).toMatch(/^hafs:\d+:\d+:\d+$/);
  });
});
