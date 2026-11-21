/**
 * How tongue and lips stand for a point of the makhārij head (spec F5, design system §10):
 * the drawing's tongue as two curves whose corner points move, and the lips as two ovals.
 * Each pose follows the point's own description in `HeadDiagram` and the catalogs, no more:
 * the tip goes to the place the point marks, or the part of the tongue the point marks rises
 * towards the palate, or the lips close. The throat's letters move nothing that a side view
 * shows. Like the drawing itself these are drafts until the sheikh has checked them.
 *
 * Pure numbers and functions; the diagram draws them and moves between them.
 */
import type { Point } from './letters';
import type { LabLetterId } from './types';

export interface Xy {
  x: number;
  y: number;
}

/**
 * The upper edge of the tongue from its tip to its root: tip, two handles, the point where
 * front and back meet, and the back's first handle. The root and the underside stay put.
 */
export interface TonguePose {
  tip: Xy;
  front1: Xy;
  front2: Xy;
  mid: Xy;
  back1: Xy;
}

/** The lips: the upper one moves down or forward, the lower one up, forward or to the teeth. */
export interface LipPose {
  upperX: number;
  upperY: number;
  lowerX: number;
  lowerY: number;
}

export interface Pose {
  tongue: TonguePose;
  lips: LipPose;
}

/** The mouth at rest: the drawing as it always was. */
export const REST: Pose = {
  tongue: {
    tip: { x: 172, y: 414 },
    front1: { x: 215, y: 402 },
    front2: { x: 290, y: 395 },
    mid: { x: 340, y: 405 },
    back1: { x: 395, y: 418 },
  },
  lips: { upperX: 141, upperY: 393, lowerX: 148, lowerY: 425 },
};

/** Where the back of the tongue ends: fixed handles and the root. */
const BACK2: Xy = { x: 412, y: 460 };
const ROOT: Xy = { x: 410, y: 520 };

const tongue = (change: Partial<TonguePose>): Pose => ({
  tongue: { ...REST.tongue, ...change },
  lips: REST.lips,
});
const lips = (change: Partial<LipPose>): Pose => ({
  tongue: REST.tongue,
  lips: { ...REST.lips, ...change },
});

/**
 * The pose of each point. Tip points: the tip at the place the point marks. Points on the
 * tongue (its edge, middle and back): that part raised towards the palate above it.
 */
export const POSES: Record<Point, Pose> = {
  // A narrow gap at the incisors: the tip comes close, it does not press.
  whistle: tongue({ tip: { x: 176, y: 404 }, front1: { x: 214, y: 400 } }),
  // The tip at the edges of the upper incisors.
  teeth: tongue({ tip: { x: 165, y: 390 }, front1: { x: 208, y: 398 } }),
  // The tip at the roots of the upper incisors.
  tongueTip: tongue({ tip: { x: 182, y: 384 }, front1: { x: 208, y: 393 } }),
  // The tip at the gum ridge: nūn in front, then rāʾ, lām with the front edges behind them.
  nun: tongue({ tip: { x: 187, y: 377 }, front1: { x: 210, y: 389 } }),
  ra: tongue({ tip: { x: 192, y: 373 }, front1: { x: 214, y: 387 } }),
  lam: tongue({ tip: { x: 199, y: 374 }, front1: { x: 220, y: 388 } }),
  // The edge of the tongue up at the molars.
  tongueSide: tongue({ front1: { x: 222, y: 388 }, front2: { x: 276, y: 380 } }),
  // The middle of the tongue up under the hard palate.
  tongueMid: tongue({
    front1: { x: 218, y: 398 },
    front2: { x: 286, y: 364 },
    mid: { x: 340, y: 398 },
  }),
  // The back of the tongue up: kāf a little in front of qāf, which meets the soft palate.
  // The handles on both sides of the meeting point stay in one line, so the back stays round.
  tongueBack: tongue({
    front2: { x: 300, y: 390 },
    mid: { x: 352, y: 378 },
    back1: { x: 378, y: 372 },
  }),
  tongueFar: tongue({
    front2: { x: 310, y: 392 },
    mid: { x: 368, y: 382 },
    back1: { x: 397, y: 377 },
  }),
  // The throat: nothing a side view shows moves.
  halqNear: REST,
  halqMid: REST,
  halqDeep: REST,
  // The lower lip at the upper incisors.
  lipTeeth: lips({ lowerX: 160, lowerY: 395 }),
  // Both lips together.
  lips: lips({ upperY: 400, lowerY: 414 }),
};

/**
 * Letters whose mouth differs from their point's: wāw shares the lips' point with bāʾ and
 * mīm, but its lips round forward and do not close (the catalog's own words for it).
 */
const LETTER_POSES: Partial<Record<LabLetterId, Pose>> = {
  waw: lips({ upperX: 135, upperY: 397, lowerX: 140, lowerY: 421 }),
};

/** The pose to show for a point, or for one letter at that point. */
export function poseOf(point: Point, letter?: LabLetterId): Pose {
  return (letter && LETTER_POSES[letter]) ?? POSES[point];
}

/** Whether a pose differs from rest: whether there is anything to show moving. */
export function moves(pose: Pose): boolean {
  return pose !== REST;
}

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const mixXy = (a: Xy, b: Xy, t: number): Xy => ({
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
});

/** The pose `t` of the way from `from` to `to` (0 to 1). */
export function between(from: Pose, to: Pose, t: number): Pose {
  const at = Math.min(1, Math.max(0, t));
  return {
    tongue: {
      tip: mixXy(from.tongue.tip, to.tongue.tip, at),
      front1: mixXy(from.tongue.front1, to.tongue.front1, at),
      front2: mixXy(from.tongue.front2, to.tongue.front2, at),
      mid: mixXy(from.tongue.mid, to.tongue.mid, at),
      back1: mixXy(from.tongue.back1, to.tongue.back1, at),
    },
    lips: {
      upperX: mix(from.lips.upperX, to.lips.upperX, at),
      upperY: mix(from.lips.upperY, to.lips.upperY, at),
      lowerX: mix(from.lips.lowerX, to.lips.lowerX, at),
      lowerY: mix(from.lips.lowerY, to.lips.lowerY, at),
    },
  };
}

/** Slow at both ends: a tongue does not start or stop at once. */
export function ease(t: number): number {
  const at = Math.min(1, Math.max(0, t));
  return at * at * (3 - 2 * at);
}

const n = (value: number): string => String(Math.round(value * 10) / 10);

/** The tongue's outline for the drawing; at rest it is the path the drawing always had. */
export function tonguePath({ tip, front1, front2, mid, back1 }: TonguePose): string {
  // The underside ends under the tip, wherever the tip is.
  return [
    `M${n(tip.x)} ${n(tip.y)}`,
    `C${n(front1.x)} ${n(front1.y)} ${n(front2.x)} ${n(front2.y)} ${n(mid.x)} ${n(mid.y)}`,
    `C${n(back1.x)} ${n(back1.y)} ${BACK2.x} ${BACK2.y} ${ROOT.x} ${ROOT.y}`,
    'L405 560',
    `C360 540 300 500 240 470 C205 455 180 440 ${n(tip.x)} ${n(tip.y + 16)}`,
    'Z',
  ].join(' ');
}

function cubic(a: Xy, b: Xy, c: Xy, d: Xy, t: number): Xy {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t] as const;
  return {
    x: w[0] * a.x + w[1] * b.x + w[2] * c.x + w[3] * d.x,
    y: w[0] * a.y + w[1] * b.y + w[2] * c.y + w[3] * d.y,
  };
}

/** A place on the tongue's upper edge: which of its two curves, and how far along it. */
export interface OnTongue {
  part: 'front' | 'back';
  at: number;
}

/** That place for a pose. */
export function onTongue(pose: TonguePose, place: OnTongue): Xy {
  return place.part === 'front'
    ? cubic(pose.tip, pose.front1, pose.front2, pose.mid, place.at)
    : cubic(pose.mid, pose.back1, BACK2, ROOT, place.at);
}

/**
 * The points that mark a part of the tongue, and where on its edge they sit: their dot rides
 * with the tongue. Every other point marks a place the tongue or the lips come to.
 */
export const RIDES: Partial<Record<Point, OnTongue>> = {
  tongueSide: { part: 'front', at: 0.35 },
  tongueMid: { part: 'front', at: 0.6 },
  tongueBack: { part: 'back', at: 0.15 },
  tongueFar: { part: 'back', at: 0.33 },
};

/** How far the point's dot has moved from its place at rest, for a pose. */
export function dotShift(point: Point, pose: Pose): Xy {
  const place = RIDES[point];
  if (!place) return { x: 0, y: 0 };
  const now = onTongue(pose.tongue, place);
  const rest = onTongue(REST.tongue, place);
  return { x: now.x - rest.x, y: now.y - rest.y };
}

/** The roof of the mouth as the drawing has it: hard palate, then the soft palate's fall. */
export const PALATE: readonly [Xy, Xy, Xy, Xy][] = [
  [
    { x: 168, y: 372 },
    { x: 220, y: 352 },
    { x: 320, y: 345 },
    { x: 382, y: 355 },
  ],
  [
    { x: 382, y: 355 },
    { x: 405, y: 362 },
    { x: 418, y: 378 },
    { x: 420, y: 398 },
  ],
];

/** Points along the palate, front to back. */
export function palatePoints(perCurve = 40): Xy[] {
  return PALATE.flatMap(([a, b, c, d]) =>
    Array.from({ length: perCurve + 1 }, (_, i) => cubic(a, b, c, d, i / perCurve))
  );
}
