/**
 * The activity log (ADR-0023): one event per finished round and per rule card read to its end.
 * Events are only ever added; XP, levels and the streak are computed from them.
 */

export const ACTIVITY_KINDS = [
  'which-rule',
  'sort-28',
  'review',
  'lab-quiz',
  'rule-card',
  'which-rule-3',
  'qalqala-letters',
  'unit-test',
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** Rounds: games with a score. */
export const ROUND_KINDS: ReadonlySet<ActivityKind> = new Set([
  'which-rule',
  'sort-28',
  'review',
  'lab-quiz',
  'which-rule-3',
  'qalqala-letters',
  'unit-test',
]);

/** The most questions one round has (Sort the 28 asks 28). */
export const MAX_ROUND_TOTAL = 100;

export interface ActivityEvent {
  /** The device's uuid: an event is stored once, however often it is sent. */
  id: string;
  kind: ActivityKind;
  /**
   * What it was about: the lab letter, the rule card, the unit of a unit test (`unit-3`); empty
   * for the unit's games.
   */
  ref: string;
  /** Epoch milliseconds. */
  at: number;
  right: number;
  total: number;
}

export function isActivityKind(value: unknown): value is ActivityKind {
  return (ACTIVITY_KINDS as readonly unknown[]).includes(value);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REF = /^[a-z0-9-]{0,40}$/;

/** Is `value` a well-formed event (the shape the device stores and the API accepts)? */
export function isActivityEvent(value: unknown): value is ActivityEvent {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    UUID.test(e.id) &&
    isActivityKind(e.kind) &&
    typeof e.ref === 'string' &&
    REF.test(e.ref) &&
    Number.isSafeInteger(e.at) &&
    (e.at as number) >= 0 &&
    Number.isInteger(e.right) &&
    Number.isInteger(e.total) &&
    (e.right as number) >= 0 &&
    (e.right as number) <= (e.total as number) &&
    (e.total as number) <= MAX_ROUND_TOTAL
  );
}

/** A unit test is passed with this share of right answers (8 of 10). */
export const UNIT_TEST_PASS = 0.8;

/** Whether a unit test with this score is passed. */
export function passesUnitTest(right: number, total: number): boolean {
  return total > 0 && right >= Math.ceil(total * UNIT_TEST_PASS);
}

/** The units whose test has been passed at least once (soft marks on the path, ADR-0024). */
export function passedUnits(events: Iterable<ActivityEvent>): Set<number> {
  const units = new Set<number>();
  for (const event of events) {
    const unit = /^unit-(\d{1,2})$/.exec(event.ref);
    if (event.kind === 'unit-test' && unit && passesUnitTest(event.right, event.total)) {
      units.add(Number(unit[1]));
    }
  }
  return units;
}
