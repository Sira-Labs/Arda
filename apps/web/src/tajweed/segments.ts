import { RULES, detect, graphemes, type RuleId } from '@arda/tajweed';
import type { Segment } from './rules';

interface Mark {
  start: number;
  end: number;
  segment: Omit<Segment, 'text'>;
}

/**
 * Splits vocalised text into segments for `TajweedText`, using the engine's detection: each
 * carrier gets its rule (and colour family), each deciding letter is marked as the follower.
 * `only` limits the marks to some rules, so a card shows just the rule it teaches.
 */
export function segmentsOf(text: string, only?: ReadonlySet<RuleId>): Segment[] {
  const followerStart = new Map(graphemes(text).map((g) => [g.end, g.start]));
  const marks: Mark[] = [];
  for (const o of detect(text)) {
    if (only && !only.has(o.rule)) continue;
    const family = RULES[o.rule].family ?? undefined;
    marks.push({
      start: o.start,
      end: o.carrierEnd,
      segment: { rule: family, ruleId: o.rule, role: 'carrier' },
    });
    const start = followerStart.get(o.end);
    if (o.follower && start !== undefined && start >= o.carrierEnd) {
      marks.push({ start, end: o.end, segment: { ruleId: o.rule, role: 'follower' } });
    }
  }
  marks.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let at = 0;
  for (const mark of marks) {
    // A letter can decide one rule and carry the next; the first mark wins.
    if (mark.start < at) continue;
    if (mark.start > at) segments.push({ text: text.slice(at, mark.start) });
    segments.push({ text: text.slice(mark.start, mark.end), ...mark.segment });
    at = mark.end;
  }
  if (at < text.length) segments.push({ text: text.slice(at) });
  return segments;
}
