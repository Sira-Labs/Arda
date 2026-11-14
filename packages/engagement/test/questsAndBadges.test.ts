import { describe, expect, it } from 'vitest';
import {
  BADGE_IDS,
  badgesFor,
  QUEST_RULES,
  questsFor,
  questXpByDay,
  roundXp,
  summarise,
  XP_RULES,
  type ActivityEvent,
  type BadgeContext,
  type BadgeId,
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
const NOON = at('2026-11-14T11:00:00Z');
const DAY = '2026-11-14';

describe('daily quests', () => {
  it('start every day at nothing, with fixed goals', () => {
    expect(questsFor([], DAY, TZ)).toEqual([
      { id: 'round', progress: 0, goal: QUEST_RULES.rounds, done: false },
      { id: 'right-answers', progress: 0, goal: QUEST_RULES.rightAnswers, done: false },
      { id: 'variety', progress: 0, goal: QUEST_RULES.kinds, done: false },
    ]);
  });

  it('count the rounds, the right answers and the kinds of the day', () => {
    const events = [
      event({ at: NOON, right: 8 }),
      event({ at: NOON + 1, kind: 'sort-28', right: 12, total: 28 }),
    ];
    expect(questsFor(events, DAY, TZ)).toEqual([
      { id: 'round', progress: 1, goal: 1, done: true },
      { id: 'right-answers', progress: 20, goal: 20, done: true },
      { id: 'variety', progress: 2, goal: 2, done: true },
    ]);
  });

  it('a rule card is a kind of practice, not a round', () => {
    const quests = questsFor(
      [event({ at: NOON, kind: 'rule-card', ref: 'iqlab', right: 0, total: 0 })],
      DAY,
      TZ
    );
    expect(quests.map((q) => q.progress)).toEqual([0, 0, 1]);
  });

  it('the same game twice is one kind', () => {
    const quests = questsFor([event({ at: NOON }), event({ at: NOON + 1 })], DAY, TZ);
    expect(quests[2]).toMatchObject({ progress: 1, done: false });
  });

  it('belong to the local day: a round after local midnight is the next day', () => {
    const late = event({ at: at('2026-11-14T23:30:00Z') });
    expect(questsFor([late], DAY, TZ)[0]!.done).toBe(false);
    expect(questsFor([late], '2026-11-15', TZ)[0]!.done).toBe(true);
  });

  it('give their bonus per quest done and per day', () => {
    const events = [
      event({ at: NOON }),
      event({ at: NOON - 86_400_000, right: 10 }),
      event({ at: NOON - 86_400_000 + 1, kind: 'review', right: 10 }),
    ];
    expect(questXpByDay(events, TZ)).toEqual(
      new Map([
        [DAY, QUEST_RULES.bonus],
        ['2026-11-13', 3 * QUEST_RULES.bonus],
      ])
    );
  });

  it('add the bonus to the total and to today, above the round cap', () => {
    const one = summarise([event({ at: NOON })], NOON, TZ);
    expect(one.totalXp).toBe(roundXp(8, 10) + QUEST_RULES.bonus);
    expect(one.todayXp).toBe(one.totalXp);
    expect(one.quests.map((q) => q.done)).toEqual([true, false, false]);

    const many = Array.from({ length: 12 }, (_, i) =>
      event({ at: NOON + i, kind: i % 2 ? 'review' : 'which-rule', right: 10 })
    );
    expect(summarise(many, NOON, TZ).todayXp).toBe(
      XP_RULES.roundDailyCap + 3 * QUEST_RULES.bonus
    );
  });

  it('yesterday keeps its bonus, today starts again', () => {
    const summary = summarise([event({ at: NOON - 86_400_000 })], NOON, TZ);
    expect(summary.todayXp).toBe(0);
    expect(summary.totalXp).toBe(roundXp(8, 10) + QUEST_RULES.bonus);
    expect(summary.quests.every((q) => q.progress === 0)).toBe(true);
  });
});

describe('badges', () => {
  const NONE: BadgeContext = { longestStreak: 0, level: 1, units: [1, 2, 3] };
  const earned = (events: ActivityEvent[], context: BadgeContext = NONE): BadgeId[] =>
    badgesFor(events, context)
      .filter((b) => b.earned)
      .map((b) => b.id);

  it('are all listed in their order, none earned by an empty log', () => {
    const badges = badgesFor([], NONE);
    expect(badges.map((b) => b.id)).toEqual([...BADGE_IDS]);
    expect(badges.some((b) => b.earned)).toBe(false);
  });

  it('first round and first rule card', () => {
    expect(earned([event({ at: NOON })])).toEqual(['first-round']);
    expect(
      earned([event({ at: NOON, kind: 'rule-card', ref: 'iqlab', right: 0, total: 0 })])
    ).toEqual(['first-card']);
  });

  it('a round without a mistake needs ten questions', () => {
    expect(earned([event({ at: NOON, right: 5, total: 5 })])).toEqual(['first-round']);
    expect(earned([event({ at: NOON, right: 10, total: 10 })])).toEqual([
      'first-round',
      'perfect-round',
    ]);
  });

  it('all 28 letters sorted right', () => {
    expect(
      earned([event({ at: NOON, kind: 'sort-28', right: 27, total: 28 })])
    ).not.toContain('all-letters');
    expect(
      earned([event({ at: NOON, kind: 'sort-28', right: 28, total: 28 })])
    ).toContain('all-letters');
  });

  it('unit tests: the first passed, then every unit of the path', () => {
    const test = (unit: number, right = 8) =>
      event({ at: NOON + unit, kind: 'unit-test', ref: `unit-${unit}`, right });
    expect(earned([test(2, 7)])).not.toContain('first-unit');
    expect(earned([test(2)])).toContain('first-unit');
    expect(earned([test(1), test(2)])).not.toContain('all-units');
    expect(earned([test(1), test(2), test(3)])).toContain('all-units');
    expect(earned([test(1)], { ...NONE, units: [] })).not.toContain('all-units');
  });

  it('streaks and levels come from the summary', () => {
    expect(earned([], { ...NONE, longestStreak: 7, level: 5 })).toEqual([
      'streak-7',
      'level-5',
    ]);
    expect(earned([], { ...NONE, longestStreak: 30, level: 10 })).toEqual([
      'streak-7',
      'streak-30',
      'level-5',
      'level-10',
    ]);
  });
});
