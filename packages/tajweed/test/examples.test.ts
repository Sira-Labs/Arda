import { describe, expect, it } from 'vitest';
import { MADD_RULES, UNIT_EXAMPLES, detect, isMaddRule } from '../src';

describe('examples of units 3–5', () => {
  it.each(UNIT_EXAMPLES.map((e) => [e.text, e.expectedRule] as const))(
    '%s shows %s',
    (text, rule) => {
      expect(detect(text, { madd: true }).map((o) => o.rule)).toContain(rule);
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

  it('gives four words for each madd, the long ones with the madda as the muṣḥaf writes it', () => {
    for (const rule of MADD_RULES) {
      const examples = UNIT_EXAMPLES.filter((e) => e.expectedRule === rule);
      expect(examples, rule).toHaveLength(4);
      for (const { text } of examples) {
        // The first madd of the example is the one it shows.
        const first = detect(text, { madd: true }).find((o) => isMaddRule(o.rule));
        expect(first?.rule, text).toBe(rule);
        if (rule !== 'madd-tabii') expect(text, rule).toContain('\u0653');
      }
    }
  });

  it('cites a word key for every example', () => {
    for (const e of UNIT_EXAMPLES) expect(e.wordKey).toMatch(/^hafs:\d+:\d+:\d+$/);
  });
});
