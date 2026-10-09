import { UNIT_TEST_PASS, passesUnitTest } from '@arda/engagement';
import { TEST_UNITS, type TestUnit } from '@/content/units';
import type { Messages } from '@/i18n/messages';

/**
 * What the end of a unit test says (ADR-0024): passed, and which test comes next – the next
 * unit's, or one still open before it – or how many right answers it needs.
 */
export function testVerdict(
  m: Messages,
  unit: TestUnit,
  right: number,
  total: number,
  passedBefore: ReadonlySet<number>
): string {
  if (!passesUnitTest(right, total)) {
    return m.games.test.notYet(Math.ceil(total * UNIT_TEST_PASS), total);
  }
  const following = TEST_UNITS.find((u) => u > unit);
  if (following !== undefined) return m.games.test.passedNext(following);
  // The last unit passed is not the whole sheet: a unit before it may still be open.
  const open = TEST_UNITS.find((u) => u !== unit && !passedBefore.has(u));
  return open !== undefined ? m.games.test.passedOpen(open) : m.games.test.passedLast;
}
