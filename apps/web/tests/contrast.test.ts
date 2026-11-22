import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The colour tokens against WCAG 2.2 AA (spec 01 §6): 4.5:1 for text (1.4.3), 3:1 for what a
 * control or a picture needs to be seen (1.4.11) and for the tajwīd colours on the page
 * (design system §3). jsdom lays nothing out, so the axe check cannot see colour; this reads
 * the tokens themselves, in both themes.
 */
const css = readFileSync(resolve(__dirname, '../src/styles/tokens.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1]!, m[2]!])
  );
}

const day = block(':root');
const THEMES = { day, night: { ...day, ...block(":root[data-theme='night']") } };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = ['bg', 'bg-elev', 'bg-elev-2'];
/** Colours text is written in, on any surface. */
const TEXT = ['text', 'text-muted', 'accent', 'accent-2', 'good', 'check', 'bad', 'info'];
/** Text on a filled surface of its own. */
const ON = [
  ['on-ink', 'ink'],
  ['on-ink-muted', 'ink'],
  ['on-accent', 'accent-fill'],
  ['on-accent-2', 'accent-2'],
] as const;
/** What must be seen without being read: a field's edge, the focus ring, parts of a picture. */
const SEEN = [
  ...SURFACES.flatMap((s) => [
    ['border-strong', s],
    ['focus', s],
  ]),
  ['mushaf-frame', 'mushaf-paper'],
  // The lab's areas carry a number and a name each; these three and the point stand without
  // an outline. The mouth space is space, and the tongue has an ink edge (lab.css).
  ['lab-halq', 'bg'],
  ['lab-shafatan', 'bg'],
  ['lab-khayshum', 'bg'],
] as const;

describe('colour contrast of the tokens (WCAG 2.2 AA)', () => {
  it('says black on white is 21:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  for (const [theme, tokens] of Object.entries(THEMES)) {
    const ratio = (front: string, back: string) => {
      expect(tokens[front], front).toBeDefined();
      expect(tokens[back], back).toBeDefined();
      return contrast(tokens[front]!, tokens[back]!);
    };

    it(`${theme}: text reads at 4.5:1 on every surface`, () => {
      for (const front of TEXT) {
        for (const back of SURFACES) {
          expect(ratio(front, back), `${front} on ${back}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      for (const [front, back] of ON) {
        expect(ratio(front, back), `${front} on ${back}`).toBeGreaterThanOrEqual(4.5);
      }
    });

    it(`${theme}: edges, focus and drawings show at 3:1`, () => {
      for (const [front, back] of SEEN) {
        expect(ratio(front, back), `${front} on ${back}`).toBeGreaterThanOrEqual(3);
      }
    });

    it(`${theme}: the lab's point shows on the tongue and on the paper`, () => {
      // The dot is filled with the point's colour and ringed with the raised surface's
      // (lab.css): on any ground one of the two stands out.
      for (const ground of ['lab-lisan', 'lab-shafatan', 'bg']) {
        expect(
          Math.max(ratio('lab-point', ground), ratio('bg-elev', ground)),
          ground
        ).toBeGreaterThanOrEqual(3);
      }
    });

    it(`${theme}: every tajwīd colour shows at 3:1 on the page`, () => {
      const colours = Object.keys(tokens).filter((name) => name.startsWith('tj-'));
      expect(colours.length).toBeGreaterThanOrEqual(7);
      for (const colour of colours) {
        expect(ratio(colour, 'mushaf-paper'), colour).toBeGreaterThanOrEqual(3);
      }
    });
  }
});
