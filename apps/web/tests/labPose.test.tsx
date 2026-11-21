import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeadDiagram, MOVE_MS } from '@/modules/lab/HeadDiagram';
import { LETTERS, type Point } from '@/modules/lab/letters';
import {
  POSES,
  REST,
  RIDES,
  between,
  dotShift,
  ease,
  moves,
  onTongue,
  palatePoints,
  poseOf,
  tonguePath,
  type Pose,
} from '@/modules/lab/pose';
import { fakeApi, Providers } from './render';

const POINTS = Object.keys(POSES) as Point[];
const TIP_POINTS: Point[] = ['whistle', 'teeth', 'tongueTip', 'nun', 'ra', 'lam'];
const THROAT: Point[] = ['halqNear', 'halqMid', 'halqDeep'];

/** The tongue's upper edge, sampled from tip to root. */
function edge(pose: Pose) {
  return (['front', 'back'] as const).flatMap((part) =>
    Array.from({ length: 41 }, (_, i) => onTongue(pose.tongue, { part, at: i / 40 }))
  );
}

/** The palate's height above a place in the mouth. */
function palateAt(x: number): number {
  const points = palatePoints();
  return points.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best))
    .y;
}

describe('the poses of tongue and lips (F5)', () => {
  it('leave the drawing at rest exactly as it was', () => {
    expect(tonguePath(REST.tongue)).toBe(
      'M172 414 C215 402 290 395 340 405 C395 418 412 460 410 520 L405 560 C360 540 300 500 240 470 C205 455 180 440 172 430 Z'
    );
    expect(REST.lips).toEqual({ upperX: 141, upperY: 393, lowerX: 148, lowerY: 425 });
  });

  it('move nothing for the throat, whose letters a side view cannot show', () => {
    for (const point of THROAT) expect(moves(POSES[point])).toBe(false);
    for (const point of POINTS.filter((p) => !THROAT.includes(p))) {
      expect(moves(POSES[point])).toBe(true);
    }
  });

  it('raise the tip for the tip’s points and leave the lips alone', () => {
    for (const point of TIP_POINTS) {
      expect(POSES[point].tongue.tip.y).toBeLessThan(REST.tongue.tip.y);
      expect(POSES[point].lips).toEqual(REST.lips);
    }
  });

  it('keep the order at the gum ridge: nūn in front of rāʾ, rāʾ in front of lām', () => {
    expect(POSES.nun.tongue.tip.x).toBeLessThan(POSES.ra.tongue.tip.x);
    expect(POSES.ra.tongue.tip.x).toBeLessThan(POSES.lam.tongue.tip.x);
    // And the edges of the incisors in front of their roots.
    expect(POSES.teeth.tongue.tip.x).toBeLessThan(POSES.tongueTip.tongue.tip.x);
  });

  it('raise the part of the tongue its point names, with the dot riding on it', () => {
    for (const point of Object.keys(RIDES) as Point[]) {
      const shift = dotShift(point, POSES[point]);
      expect(shift.y).toBeLessThan(-5);
      expect(dotShift(point, REST)).toEqual({ x: 0, y: 0 });
      expect(POSES[point].tongue.tip).toEqual(REST.tongue.tip);
    }
    // Kāf a little in front of qāf.
    expect(POSES.tongueBack.tongue.mid.x).toBeLessThan(POSES.tongueFar.tongue.mid.x);
    // A place the mouth comes to stays where it is.
    expect(dotShift('teeth', POSES.teeth)).toEqual({ x: 0, y: 0 });
  });

  it('never push the tongue through the roof of the mouth', () => {
    for (const point of POINTS) {
      for (const p of edge(POSES[point]).filter((q) => q.x > 200 && q.x < 400)) {
        expect(p.y, `${point} at x=${Math.round(p.x)}`).toBeGreaterThan(palateAt(p.x));
      }
    }
  });

  it('close the lips for bāʾ and mīm, round them open for wāw, bring the lower to the teeth for fāʾ', () => {
    const gap = ({ lips }: Pose) => lips.lowerY - 10 - (lips.upperY + 9);
    expect(gap(REST)).toBeGreaterThan(0);
    expect(gap(poseOf('lips', 'ba'))).toBeLessThanOrEqual(0);
    expect(poseOf('lips', 'mim')).toBe(POSES.lips);
    const waw = poseOf(LETTERS.waw.point, 'waw');
    expect(gap(waw)).toBeGreaterThan(0);
    expect(gap(waw)).toBeLessThan(gap(REST));
    expect(waw.lips.upperX).toBeLessThan(REST.lips.upperX);
    expect(waw.lips.lowerX).toBeLessThan(REST.lips.lowerX);
    // The lower lip's top at the edge of the upper incisors (the tooth ends at y = 382).
    expect(POSES.lipTeeth.lips.lowerY - 10).toBeCloseTo(385, 0);
    expect(POSES.lipTeeth.lips.upperY).toBe(REST.lips.upperY);
    expect(POSES.lipTeeth.tongue).toBe(REST.tongue);
  });

  it('go from one pose to the other, slow at both ends', () => {
    expect(between(REST, POSES.ra, 0)).toEqual(REST);
    expect(between(REST, POSES.ra, 1)).toEqual(POSES.ra);
    expect(between(REST, POSES.ra, 7)).toEqual(POSES.ra);
    expect(between(REST, POSES.lips, 0.5).lips.upperY).toBeCloseTo(396.5);
    expect(ease(0)).toBe(0);
    expect(ease(0.5)).toBe(0.5);
    expect(ease(1)).toBe(1);
    expect(ease(0.1)).toBeLessThan(0.1);
    expect(ease(0.9)).toBeGreaterThan(0.9);
  });
});

describe('the head in motion', () => {
  /** A clock the test moves, animation frames included. */
  const fakeClock = () =>
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
        'Date',
      ],
    });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('arda.language', 'de');
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const show = (point?: Point, letter?: keyof typeof LETTERS) =>
    render(
      <Providers client={fakeApi({}).client}>
        <HeadDiagram point={point} letter={letter} />
      </Providers>
    );
  const tongue = () => document.querySelector('[data-part="tongue"]')!.getAttribute('d');
  const lip = (part: 'upper-lip' | 'lower-lip') =>
    Number(document.querySelector(`[data-part="${part}"]`)!.getAttribute('cy'));

  it('starts at rest and brings the tongue to the point', async () => {
    fakeClock();
    show('ra');
    expect(tongue()).toBe(tonguePath(REST.tongue));
    await act(() => vi.advanceTimersByTimeAsync(350 + MOVE_MS / 2));
    expect(tongue()).not.toBe(tonguePath(REST.tongue));
    expect(tongue()).not.toBe(tonguePath(POSES.ra.tongue));
    await act(() => vi.advanceTimersByTimeAsync(MOVE_MS));
    expect(tongue()).toBe(tonguePath(POSES.ra.tongue));
  });

  it('shows the movement again when asked', async () => {
    fakeClock();
    show('lips', 'ba');
    await act(() => vi.advanceTimersByTimeAsync(350 + MOVE_MS + 100));
    expect(lip('upper-lip')).toBe(POSES.lips.lips.upperY);
    fireEvent.click(screen.getByRole('button', { name: 'Bewegung zeigen' }));
    await act(() => vi.advanceTimersByTimeAsync(40));
    expect(lip('upper-lip')).toBeLessThan(POSES.lips.lips.upperY);
    await act(() => vi.advanceTimersByTimeAsync(MOVE_MS + 100));
    expect(lip('upper-lip')).toBe(POSES.lips.lips.upperY);
    expect(lip('lower-lip')).toBe(POSES.lips.lips.lowerY);
  });

  it('stands at the point from the start when less motion is wanted', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }));
    show('tongueMid');
    expect(tongue()).toBe(tonguePath(POSES.tongueMid.tongue));
    // The dot sits on the raised tongue.
    const dot = document.querySelector('.lab-dot')!;
    expect(Number(dot.getAttribute('cy'))).toBeLessThan(400);
    expect(screen.getByRole('button', { name: 'Bewegung zeigen' })).toBeInTheDocument();
  });

  it('offers no movement for the throat or for the head without a letter', () => {
    show('halqMid');
    expect(screen.queryByRole('button', { name: 'Bewegung zeigen' })).toBeNull();
    cleanup();
    show();
    expect(screen.queryByRole('button', { name: 'Bewegung zeigen' })).toBeNull();
    expect(tongue()).toBe(tonguePath(REST.tongue));
  });
});
