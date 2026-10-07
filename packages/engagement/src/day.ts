/**
 * Calendar days in the learner's time zone (ported from Suffa's `packages/engagement`): a day
 * ends at local midnight, not at UTC midnight. Days are `YYYY-MM-DD` strings, so they compare
 * and sort as text.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** The local day of an instant (epoch ms), e.g. 2026-10-06T22:30Z in Europe/Berlin → "2026-10-07". */
export function dayKey(at: number, timeZone: string): string {
  const parts = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(new Date(at))
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** `day` shifted by `n` calendar days. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
