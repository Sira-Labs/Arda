import { createHash } from 'node:crypto';
import {
  sura as suraOf,
  type Pack,
  type PackAya,
  type PackSource,
  type PackSpan,
  type PackSura,
  type PackWord,
} from '@arda/quran';
import { PACK_RULES, type PackRuleId } from '@arda/tajweed';
import { align } from './align';
import type { Annotation } from './cpfair';
import type { TanzilText } from './tanzil';
import { isMark, splitWords, type WordSpan } from './words';

type Word = PackWord<PackRuleId>;
type Span = PackSpan<PackRuleId>;

export interface PackStats {
  ayat: number;
  words: number;
  spans: number;
  /** Āyāt whose annotations were moved onto Tanzil 1.1 (see align.ts). */
  realigned: string[];
  overlaps: number;
}

export interface PackInput {
  id: string;
  version: number;
  title: string;
  fromSura: number;
  toSura: number;
  tanzil: TanzilText;
  annotations: Map<string, Annotation[]>;
  sources: PackSource[];
}

/** The rules on one word, as spans of its text (carrier and follower split, see PackSpan). */
function spansOf(word: WordSpan, annotations: readonly Annotation[]): Span[] {
  const chars = [...word.text];
  const spans: Span[] = [];
  for (const a of annotations) {
    if (a.end <= word.start || a.start >= word.end) continue;
    let start = Math.max(a.start, word.start) - word.start;
    let end = Math.min(a.end, word.end) - word.start;
    const rule = PACK_RULES[a.rule];
    const carries = a.start >= word.start;
    if (!rule.decidedByNext) {
      spans.push([start, end, a.rule]);
      continue;
    }
    if (carries) {
      // The carrier is the whole letter the rule sits on: the nūn, the mīm, or the letter
      // with the tanwīn, with its marks.
      while (start > 0 && isMark(chars[start]!)) start--;
      let carrierEnd = start + 1;
      while (carrierEnd < chars.length && isMark(chars[carrierEnd]!)) carrierEnd++;
      spans.push([start, carrierEnd, a.rule]);
      start = carrierEnd;
    }
    while (end < chars.length && isMark(chars[end]!)) end++;
    if (end > start) spans.push([start, end, a.rule, 'f']);
  }
  return spans.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}

const overlapsIn = (spans: readonly Span[]): number =>
  spans.filter((s, i) => i > 0 && s[0] < spans[i - 1]![1]).length;

function wordsOf(
  text: readonly string[],
  annotations: readonly Annotation[],
  offset = 0
): Word[] {
  return splitWords(text, offset).map((w) => {
    // Offsets in the pack are UTF-16 code units; with Arabic in the BMP they equal code points.
    if ([...w.text].some((c) => c.codePointAt(0)! > 0xffff)) {
      throw new Error(`a character outside the BMP in ${w.text}`);
    }
    const r = spansOf(w, annotations);
    return { t: w.text, ...(r.length ? { r } : {}), ...(w.after ? { a: w.after } : {}) };
  });
}

/** Builds the pack; throws when the sources do not fit together (see align.ts). */
export function buildPack(input: PackInput): {
  pack: Pack<PackRuleId>;
  stats: PackStats;
} {
  const stats: PackStats = { ayat: 0, words: 0, spans: 0, realigned: [], overlaps: 0 };

  const placed = (key: string, text: readonly string[]) => {
    const raw = input.annotations.get(key);
    if (!raw) throw new Error(`cpfair: no annotations for ${key}`);
    const aligned = align(text, raw);
    if (!aligned)
      throw new Error(`cpfair: ${key} cannot be aligned with the Tanzil text`);
    if (aligned.moved > 0) stats.realigned.push(key);
    return aligned.annotations;
  };

  const fatiha = input.tanzil.ayat.get('1:1');
  if (!fatiha) throw new Error('Tanzil: al-Fātiḥa 1 is missing');
  const plain = (text: string) => text.replace(/\u0651/g, '');

  const suras: PackSura<PackRuleId>[] = [];
  for (let n = input.fromSura; n <= input.toSura; n++) {
    const meta = suraOf(n);
    if (!meta) throw new Error(`no sūra ${n}`);
    const hasBasmala = n !== 9;
    const ayat: PackAya<PackRuleId>[] = [];
    let basmala: Word[] | undefined;
    for (let aya = 1; aya <= meta.ayas; aya++) {
      const key = `${n}:${aya}`;
      const full = [...(input.tanzil.ayat.get(key) ?? '')];
      if (full.length === 0) throw new Error(`Tanzil: ${key} is missing`);
      const annotations = placed(key, full);
      // Tanzil writes the basmala at the start of āya 1; it is not part of the āya. It is the
      // first four words, the same as al-Fātiḥa 1 but for a shadda (95, 97).
      let skip = 0;
      if (aya === 1 && hasBasmala && n !== 1) {
        let end = -1;
        for (let w = 0; w < 4; w++) end = full.indexOf(' ', end + 1);
        if (end < 0 || plain(full.slice(0, end).join('')) !== plain(fatiha)) {
          throw new Error(`Tanzil: ${key} does not start with the basmala`);
        }
        skip = end + 1;
        if (annotations.some((a) => a.start < skip && a.end > end)) {
          throw new Error(`cpfair: ${key} has a rule across the basmala`);
        }
        basmala = wordsOf(
          full.slice(0, end),
          annotations.filter((a) => a.end <= end)
        );
      }
      const own = annotations.filter((a) => a.start >= skip);
      const words = wordsOf(full.slice(skip), own, skip);
      for (const w of words) {
        stats.words++;
        stats.spans += w.r?.length ?? 0;
        stats.overlaps += overlapsIn(w.r ?? []);
      }
      stats.ayat++;
      ayat.push({ aya, words });
    }
    suras.push({ sura: n, name: meta.name, ...(basmala ? { basmala } : {}), ayat });
  }

  return {
    pack: {
      format: 1,
      id: input.id,
      version: input.version,
      script: 'uthmani',
      riwaya: 'hafs',
      title: input.title,
      sources: input.sources,
      copyright: input.tanzil.copyright,
      suras,
    },
    stats,
  };
}

/** The bytes of a pack as written, and their SHA-256: the same input gives the same file. */
export function serialise(pack: Pack<PackRuleId>): { bytes: Buffer; sha256: string } {
  const bytes = Buffer.from(`${JSON.stringify(pack)}\n`, 'utf8');
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}
