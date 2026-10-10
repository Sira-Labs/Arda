import { describe, expect, it } from 'vitest';
import { MADD_RULES, RULES, UNIT_EXAMPLES, detect, isMaddRule } from '../src';

describe('examples of units 3–6', () => {
  it.each(UNIT_EXAMPLES.map((e) => [e.text, e.expectedRule] as const))(
    '%s shows %s',
    (text, rule) => {
      expect(detect(text, { madd: true, tafkhim: true }).map((o) => o.rule)).toContain(
        rule
      );
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

  it('gives a word for each heavy letter and four for each weight of lām and rāʾ', () => {
    const letters = UNIT_EXAMPLES.filter((e) => e.expectedRule === 'tafkhim').flatMap(
      ({ text }) =>
        detect(text, { tafkhim: true })
          .filter((o) => o.rule === 'tafkhim')
          .map((o) => text[o.start])
    );
    expect(new Set(letters)).toEqual(new Set(RULES.tafkhim.letters));
    for (const rule of ['lam-heavy', 'lam-light', 'ra-heavy', 'ra-light'] as const) {
      const examples = UNIT_EXAMPLES.filter((e) => e.expectedRule === rule);
      expect(examples, rule).toHaveLength(4);
      for (const { text } of examples) {
        // The example holds one lām of Allāh or one rāʾ: the one it shows.
        const prefix = rule.slice(0, 3);
        const of = detect(text, { tafkhim: true }).filter((o) =>
          o.rule.startsWith(prefix)
        );
        expect(
          of.map((o) => o.rule),
          text
        ).toEqual([rule]);
      }
    }
    // A rāʾ sākina is shown for every reason it can have.
    const reasons = UNIT_EXAMPLES.flatMap((e) =>
      detect(e.text, { tafkhim: true })
        .filter((o) => o.rule === e.expectedRule && o.rule.startsWith('ra'))
        .map((o) => o.reason)
    );
    expect(reasons).toEqual(
      expect.arrayContaining([
        'after-fatha',
        'after-wasla',
        'before-heavy',
        'after-kasra',
      ])
    );
  });

  it('cites a word key for every example', () => {
    for (const e of UNIT_EXAMPLES) expect(e.wordKey).toMatch(/^hafs:\d+:\d+:\d+$/);
  });
});
