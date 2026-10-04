import { madinaPage, wordKey, type PackSura } from '@arda/quran';
import type { PackRuleId } from '@arda/tajweed';
import type { MushafPack } from '@/content/packs';
import type { MushafWord } from './words';

/** A word's place: sūra, āya and its number in the āya, from 1 (āya 0: the basmala). */
export interface Place {
  sura: number;
  aya: number;
  n: number;
}

export interface PageWord {
  key: string;
  word: MushafWord;
  place: Place;
  /** Madīna text: the āya ends after this word (the app prints its number). */
  ayaEnd?: number;
}

/** What a page holds, top to bottom. */
export type Block =
  | { kind: 'heading'; sura: number }
  | { kind: 'basmala'; sura: number; words: PageWord[] }
  /** IndoPak: one printed line. */
  | { kind: 'line'; line: number; words: PageWord[] }
  /** Madīna: the running text of the page (no line data). */
  | { kind: 'flow'; words: PageWord[] };

type Sura = PackSura<PackRuleId>;

const placed = (sura: number, aya: number, words: readonly MushafWord[]): PageWord[] =>
  words.map((word, i) => ({
    key: aya === 0 ? `basmala:${sura}:${i + 1}` : wordKey('hafs', sura, aya, i + 1),
    word,
    place: { sura, aya, n: i + 1 },
  }));

/** The printed page an āya starts on, in the pack's script and edition. */
export function pageOfAya(
  pack: MushafPack,
  sura: number,
  aya: number
): number | undefined {
  const s = pack.suras.find((x) => x.sura === sura);
  const first = s?.ayat[aya - 1]?.words[0];
  if (!s || !first) return undefined;
  if (pack.script === 'uthmani') return madinaPage(sura, aya);
  return first.at![0] + pack.layout!.pageOffset;
}

/** The page a sūra starts on: where its heading stands. */
export function pageOfSura(pack: MushafPack, sura: number): number | undefined {
  const s = pack.suras.find((x) => x.sura === sura);
  if (!s) return undefined;
  if (pack.script === 'uthmani' || !s.at) return pageOfAya(pack, sura, 1);
  return s.at[0] + pack.layout!.pageOffset;
}

/** IndoPak: the page's lines as printed, with headings and basmala on their own lines. */
function indopakBlocks(pack: MushafPack, page: number): Block[] {
  const own = page - pack.layout!.pageOffset;
  const lines = new Map<number, Block>();
  const lineOf = (line: number) => {
    let block = lines.get(line);
    if (!block) lines.set(line, (block = { kind: 'line', line, words: [] }));
    return block;
  };
  for (const s of pack.suras) {
    if (s.at?.[0] === own) lines.set(s.at[1], { kind: 'heading', sura: s.sura });
    const basmala = (s.basmala ?? []).filter((w) => w.at![0] === own);
    if (basmala.length) {
      lines.set(basmala[0]!.at![1], {
        kind: 'basmala',
        sura: s.sura,
        words: placed(s.sura, 0, s.basmala!),
      });
    }
    for (const a of s.ayat) {
      placed(s.sura, a.aya, a.words).forEach((w) => {
        if (w.word.at![0] !== own) return;
        const block = lineOf(w.word.at![1]);
        if (block.kind === 'line') block.words.push(w);
      });
    }
  }
  return [...lines.entries()].sort(([a], [b]) => a - b).map(([, block]) => block);
}

/** Madīna: the āyāt on the page, a heading and basmala where a sūra begins. */
function madinaBlocks(pack: MushafPack, page: number): Block[] {
  const blocks: Block[] = [];
  let flow: PageWord[] = [];
  const close = () => {
    if (flow.length) blocks.push({ kind: 'flow', words: flow });
    flow = [];
  };
  for (const s of pack.suras as Sura[]) {
    for (const a of s.ayat) {
      if (madinaPage(s.sura, a.aya) !== page) continue;
      if (a.aya === 1) {
        close();
        blocks.push({ kind: 'heading', sura: s.sura });
        if (s.basmala) {
          blocks.push({
            kind: 'basmala',
            sura: s.sura,
            words: placed(s.sura, 0, s.basmala),
          });
        }
      }
      const words = placed(s.sura, a.aya, a.words);
      words[words.length - 1]!.ayaEnd = a.aya;
      flow.push(...words);
    }
  }
  close();
  return blocks;
}

/** What the printed page holds, as far as the pack has it. */
export function pageBlocks(pack: MushafPack, page: number): Block[] {
  return pack.script === 'indopak' ? indopakBlocks(pack, page) : madinaBlocks(pack, page);
}

/** The sūras with a word on the page, in order. */
export const surasOn = (blocks: readonly Block[]): number[] => [
  ...new Set(
    blocks.flatMap((b) =>
      b.kind === 'heading'
        ? [b.sura]
        : 'words' in b
          ? b.words.map((w) => w.place.sura)
          : []
    )
  ),
];
