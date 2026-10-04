import { isPackRuleId, type PackRuleId } from '@arda/tajweed';

/** One annotation: a rule over code points [start, end) of the āya's Tanzil text. */
export interface Annotation {
  rule: PackRuleId;
  start: number;
  end: number;
}

/** cpfair's annotations as "sura:aya" → annotations, checked for shape. */
export function parseCpfair(raw: string): Map<string, Annotation[]> {
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('cpfair: expected an array of āyāt');
  const byAya = new Map<string, Annotation[]>();
  for (const entry of data as { surah: unknown; ayah: unknown; annotations: unknown }[]) {
    if (!Number.isInteger(entry.surah) || !Number.isInteger(entry.ayah)) {
      throw new Error('cpfair: an entry without sura and āya');
    }
    if (!Array.isArray(entry.annotations)) throw new Error('cpfair: annotations missing');
    const list = (
      entry.annotations as { rule: unknown; start: unknown; end: unknown }[]
    ).map((a) => {
      if (!isPackRuleId(a.rule))
        throw new Error(`cpfair: unknown rule ${String(a.rule)}`);
      if (
        !Number.isInteger(a.start) ||
        !Number.isInteger(a.end) ||
        (a.end as number) <= (a.start as number)
      ) {
        throw new Error(`cpfair: bad span in ${entry.surah}:${entry.ayah}`);
      }
      return { rule: a.rule, start: a.start as number, end: a.end as number };
    });
    byAya.set(
      `${entry.surah}:${entry.ayah}`,
      list.sort((x, y) => x.start - y.start)
    );
  }
  return byAya;
}
