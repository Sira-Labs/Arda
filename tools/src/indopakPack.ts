import type { Pack, PackSource, PackWord } from '@arda/quran';
import type { PackRuleId } from '@arda/tajweed';
import { carrySpans } from './carry';
import type { IndopakText, IndopakWord } from './indopak';

type Word = PackWord<PackRuleId>;

/**
 * The page numbers DigitalKhatt's layout uses run one below the sheikh's printed copy (its
 * page 6 is his page 7; checked on four pages, ADR-0017 update): the offset the app adds.
 */
export const SHEIKH_PAGE_OFFSET = 1;

export interface IndopakPackInput {
  id: string;
  version: number;
  title: string;
  /** The ʿUthmānī pack of the same sūras, whose rules are carried over. */
  uthmani: Pack<PackRuleId>;
  indopak: IndopakText;
  sources: PackSource[];
  /** DigitalKhatt's MIT notice, which travels with the text. */
  copyright: string;
}

export interface IndopakStats {
  words: number;
  spans: number;
}

/**
 * An IndoPak pack (S2.2): DigitalKhatt's words verbatim, with their place on the 15-line page,
 * keyed like the ʿUthmānī pack (same āyāt, same word numbers) and with its rules carried
 * letter by letter. Fails when an āya has another number of words or a rule finds no letter.
 */
export function buildIndopakPack(input: IndopakPackInput): {
  pack: Pack<PackRuleId>;
  stats: IndopakStats;
} {
  const stats: IndopakStats = { words: 0, spans: 0 };
  const misses: string[] = [];

  const word = (source: Word, target: IndopakWord, key: string): Word => {
    stats.words++;
    let r: Word['r'];
    if (source.r) {
      const carried = carrySpans(source.t, target.text, source.r);
      for (const m of carried.misses) {
        misses.push(`${key} ${m.span[2]}: ${m.from} → ${m.to || '(none)'}`);
      }
      stats.spans += carried.spans.length;
      if (carried.spans.length) r = carried.spans;
    }
    return {
      t: target.text,
      ...(r ? { r } : {}),
      ...(target.after ? { a: target.after } : {}),
      at: [target.page, target.line],
    };
  };

  const pair = (
    source: readonly Word[],
    target: readonly IndopakWord[] | undefined,
    key: string
  ): Word[] => {
    if (!target || target.length !== source.length) {
      throw new Error(
        `IndoPak: ${key} has ${target?.length ?? 0} words, the ʿUthmānī text ${source.length}`
      );
    }
    return source.map((w, i) => word(w, target[i]!, `${key}:${i + 1}`));
  };

  const suras = input.uthmani.suras.map((s) => {
    const ip = input.indopak.suras[s.sura - 1]!;
    return {
      sura: s.sura,
      name: s.name,
      ...(s.basmala ? { basmala: pair(s.basmala, ip.basmala, `${s.sura}:basmala`) } : {}),
      ayat: s.ayat.map((a) => ({
        aya: a.aya,
        words: pair(a.words, ip.ayat[a.aya - 1], `${s.sura}:${a.aya}`),
      })),
      at: [ip.heading.page, ip.heading.line] as [number, number],
    };
  });

  if (misses.length) {
    throw new Error(`IndoPak: rules without a letter:\n${misses.join('\n')}`);
  }
  return {
    pack: {
      format: 1,
      id: input.id,
      version: input.version,
      script: 'indopak',
      riwaya: 'hafs',
      title: input.title,
      sources: input.sources,
      copyright: input.copyright,
      layout: {
        name: 'IndoPak, 15 lines (DigitalKhatt)',
        pages: input.indopak.pages,
        lines: 15,
        pageOffset: SHEIKH_PAGE_OFFSET,
      },
      suras,
    },
    stats,
  };
}
