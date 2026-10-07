import { describe, expect, it } from 'vitest';
import {
  addDays,
  computeStreak,
  dayKey,
  isActivityEvent,
  levelFor,
  MAX_SHIELDS,
  passedUnits,
  passesUnitTest,
  roundXp,
  summarise,
  xpAwards,
  xpForLevel,
  XP_RULES,
  type ActivityEvent,
} from '../src/index.js';

const TZ = 'Europe/Berlin';
const at = (iso: string) => Date.parse(iso);
let n = 0;
const event = (input: Partial<ActivityEvent> & { at: number }): ActivityEvent => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  kind: 'which-rule',
  ref: '',
  right: 8,
  total: 10,
  ...input,
});

describe('days', () => {
  it('end at local midnight, not at UTC midnight', () => {
    expect(dayKey(at('2026-10-06T22:30:00Z'), TZ)).toBe('2026-10-07');
    expect(dayKey(at('2026-10-06T22:30:00Z'), 'UTC')).toBe('2026-10-06');
  });

  it('shift across months', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('XP rules v1', () => {
  it('give 2 per right answer, 5 for finishing and 5 more without a mistake', () => {
    expect(roundXp(8, 10)).toBe(21);
    expect(roundXp(10, 10)).toBe(30);
    expect(roundXp(0, 10)).toBe(5);
  });

  it('give a rule card 20 XP once, however often it is read', () => {
    const awards = xpAwards(
      [
        event({
          kind: 'rule-card',
          ref: 'iqlab',
          right: 0,
          total: 0,
          at: at('2026-10-07T08:00Z'),
        }),
        event({
          kind: 'rule-card',
          ref: 'iqlab',
          right: 0,
          total: 0,
          at: at('2026-10-08T08:00Z'),
        }),
        event({
          kind: 'rule-card',
          ref: 'ikhfa',
          right: 0,
          total: 0,
          at: at('2026-10-08T09:00Z'),
        }),
      ],
      TZ
    );
    expect(awards.map((a) => a.points)).toEqual([
      XP_RULES.ruleCard,
      0,
      XP_RULES.ruleCard,
    ]);
  });

  it('cap round XP at 200 a day, and start again the next local day', () => {
    // A perfect round of 28 is 28·2 + 5 + 5 = 66 XP.
    const rounds = Array.from({ length: 5 }, (_, i) =>
      event({ kind: 'sort-28', right: 28, total: 28, at: at(`2026-10-07T10:0${i}:00Z`) })
    );
    const late = event({
      kind: 'sort-28',
      right: 28,
      total: 28,
      at: at('2026-10-07T22:30:00Z'),
    });
    const points = xpAwards([...rounds, late], TZ).map((a) => a.points);
    expect(points).toEqual([66, 66, 66, 2, 0, 66]);
  });

  it('do not depend on the order events arrive in', () => {
    const events = [
      event({ at: at('2026-10-07T10:00Z') }),
      event({
        kind: 'rule-card',
        ref: 'iqlab',
        right: 0,
        total: 0,
        at: at('2026-10-07T09:00Z'),
      }),
      event({ at: at('2026-10-07T08:00Z') }),
    ];
    const forward = xpAwards(events, TZ).map((a) => [a.event.id, a.points]);
    const backward = xpAwards([...events].reverse(), TZ).map((a) => [
      a.event.id,
      a.points,
    ]);
    expect(backward).toEqual(forward);
  });
});

describe('levels', () => {
  it('follow the curve 50·n^1.5', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 50, 141, 260, 400]);
    expect(levelFor(0)).toEqual({ level: 1, into: 0, span: 50 });
    expect(levelFor(150)).toEqual({ level: 3, into: 9, span: 119 });
  });
});

describe('streak with shields', () => {
  const days = (from: string, count: number) =>
    Array.from({ length: count }, (_, i) => addDays(from, i));

  it('counts days in a row and keeps standing while today is not over', () => {
    const active = new Set(days('2026-10-01', 3));
    expect(computeStreak(active, '2026-10-03')).toMatchObject({
      current: 3,
      activeToday: true,
    });
    expect(computeStreak(active, '2026-10-04')).toMatchObject({
      current: 3,
      activeToday: false,
    });
    expect(computeStreak(active, '2026-10-05').current).toBe(0);
  });

  it('earns a shield every 7 active days, at most 2, and spends one on a missed day', () => {
    const fortnight = new Set(days('2026-10-01', 21));
    expect(computeStreak(fortnight, '2026-10-21').shields).toBe(MAX_SHIELDS);
    const week = new Set([...days('2026-10-01', 7), '2026-10-09']);
    const streak = computeStreak(week, '2026-10-09');
    expect(streak).toMatchObject({
      current: 8,
      shields: 0,
      shieldedDays: ['2026-10-08'],
    });
    expect(streak.longest).toBe(8);
  });
});

describe('the summary', () => {
  it('adds up XP, today and the streak in the learner time zone', () => {
    const events = [
      event({ at: at('2026-10-06T09:00Z'), right: 10, total: 10 }),
      event({ at: at('2026-10-06T22:30Z'), right: 5, total: 10 }),
    ];
    const summary = summarise(events, at('2026-10-07T12:00Z'), TZ);
    expect(summary.totalXp).toBe(30 + 15);
    expect(summary.todayXp).toBe(15);
    expect(summary.streak).toMatchObject({ current: 2, activeToday: true });
    expect(summary.level.level).toBe(1);
  });
});

describe('event shape', () => {
  const ok = event({ at: at('2026-10-07T10:00Z') });
  it.each([
    ['a well-formed event', ok, true],
    ['an unknown kind', { ...ok, kind: 'cheat' }, false],
    ['more right than asked', { ...ok, right: 11 }, false],
    ['a round too long', { ...ok, right: 0, total: 101 }, false],
    ['a negative time', { ...ok, at: -1 }, false],
    ['an id that is no uuid', { ...ok, id: 'x' }, false],
    ['an odd ref', { ...ok, ref: 'DROP TABLE' }, false],
  ])('accepts %s: %s', (_name, value, expected) => {
    expect(isActivityEvent(value)).toBe(expected);
  });
});

describe('unit tests', () => {
  it('are passed with 8 of 10, and counted per unit', () => {
    expect(passesUnitTest(8, 10)).toBe(true);
    expect(passesUnitTest(7, 10)).toBe(false);
    expect(passesUnitTest(0, 0)).toBe(false);
    const t = at('2026-10-07T10:00Z');
    expect([
      ...passedUnits([
        event({ at: t, kind: 'unit-test', ref: 'unit-2', right: 7 }),
        event({ at: t, kind: 'unit-test', ref: 'unit-3', right: 9 }),
        event({ at: t, kind: 'unit-test', ref: 'unit-3', right: 4 }),
        // Another game with a good score, or an odd ref, passes nothing.
        event({ at: t, kind: 'which-rule-3', ref: 'unit-4', right: 10 }),
        event({ at: t, kind: 'unit-test', ref: 'unit-x', right: 10 }),
      ]),
    ]).toEqual([3]);
  });

  it('earn round XP like any game', () => {
    const t = at('2026-10-07T10:00Z');
    const [award] = xpAwards(
      [event({ at: t, kind: 'unit-test', ref: 'unit-2', right: 10 })],
      TZ
    );
    expect(award?.points).toBe(roundXp(10, 10));
  });
});
