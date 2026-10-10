import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  PACK_RULES,
  detect,
  isMaddRule,
  type PackRuleId,
  type RuleId,
} from '@arda/tajweed';
import { parseCpfair } from '../src/cpfair';
import {
  JUZ_STARTS,
  wordCount,
  type Pack,
  type PackIndex,
  type PackWord,
} from '@arda/quran';
import { countsModule, wordCounts } from '../src/counts';
import { buildSpec } from '../src/build';
import { juzStarts, madinaPageStarts, pagesModule } from '../src/pages';
import { parseIndopak } from '../src/indopak';
import { buildPack, serialise } from '../src/pack';
import { PACKS } from '../src/packs';
import { gunzipSync } from 'node:zlib';
import { parseTanzil } from '../src/tanzil';
import {
  TIMED_RECITERS,
  buildSurahTimings,
  buildTimings,
  serialiseTimings,
  shippedSuras,
} from '../src/timings';
import { unzipFile } from '../src/zip';

const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const COPYRIGHT =
  '#  Tanzil Quran Text (Uthmani, Version 1.1)\n#  Copyright (C) 2007-2026 Tanzil Project';

/** al-Falaq with the basmala and a few rules, as Tanzil and cpfair give it. */
function falaq(second = 'مِن شَرِّ مَا خَلَقَ') {
  const ayat = [
    `قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ`,
    second,
    'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ',
    'وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ',
    'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
  ];
  const text = [
    `1|1|${BASMALA}`,
    ...ayat.map((t, i) => `113|${i + 1}|${i === 0 ? `${BASMALA} ` : ''}${t}`),
  ];
  const prefix = [...BASMALA].length + 1;
  const first = [...ayat[0]!];
  const annotations = [
    { surah: 1, ayah: 1, annotations: [{ rule: 'hamzat_wasl', start: 7, end: 8 }] },
    {
      surah: 113,
      ayah: 1,
      annotations: [
        { rule: 'hamzat_wasl', start: 7, end: 8 },
        {
          rule: 'qalqalah',
          start: prefix + first.lastIndexOf('ق'),
          end: prefix + first.lastIndexOf('ق') + 1,
        },
      ],
    },
    { surah: 113, ayah: 2, annotations: [{ rule: 'ikhfa', start: 2, end: 6 }] },
    ...[3, 4, 5].map((ayah) => ({ surah: 113, ayah, annotations: [] })),
  ];
  return {
    tanzil: parseTanzil(`${text.join('\n')}\n${COPYRIGHT}\n`),
    annotations: parseCpfair(JSON.stringify(annotations)),
  };
}

const build = (input = falaq()) =>
  buildPack({
    id: 'test',
    version: 1,
    title: 't',
    fromSura: 113,
    toSura: 113,
    ...input,
    sources: [],
  });

describe('building a pack', () => {
  it('takes the basmala off āya 1 and keeps it, with its rules, before the sūra', () => {
    const { pack } = build();
    const sura = pack.suras[0]!;
    expect(sura.basmala?.map((w) => w.t).join(' ')).toBe(BASMALA);
    expect(sura.basmala?.[1]?.r).toEqual([[0, 1, 'hamzat_wasl']]);
    expect(sura.ayat[0]!.words.map((w) => w.t)).toEqual([
      'قُلْ',
      'أَعُوذُ',
      'بِرَبِّ',
      'ٱلْفَلَقِ',
    ]);
    // The qalqala on ٱلْفَلَقِ moved with the basmala taken off: word 4, the qāf.
    const last = sura.ayat[0]!.words[3]!;
    expect(last.t.slice(last.r![0]![0], last.r![0]![1])).toBe('ق');
  });

  it('splits a rule decided by the next letter into carrier and follower', () => {
    const { pack } = build();
    const [min, sharr] = pack.suras[0]!.ayat[1]!.words as [PackWord, PackWord];
    expect(min.r).toEqual([[2, 3, 'ikhfa']]);
    expect(sharr.r).toEqual([[0, 2, 'ikhfa', 'f']]);
  });

  it('carries the Tanzil copyright and gives the same bytes for the same input', () => {
    const first = serialise(build().pack);
    const again = serialise(build().pack);
    expect(first.sha256).toBe(again.sha256);
    expect(build().pack.copyright).toContain('Tanzil Project');
  });

  it('refuses an āya whose annotations do not fit', () => {
    expect(() => build(falaq('قُلْ'))).toThrow(/cannot be aligned/);
  });
});

const packs = fileURLToPath(new URL('../../apps/web/public/packs/', import.meta.url));
const index = JSON.parse(readFileSync(`${packs}index.json`, 'utf8')) as PackIndex;
const shipped = index.packs.map((entry) => {
  const bytes = readFileSync(`${packs}${entry.file}`);
  return { entry, bytes, pack: JSON.parse(bytes.toString('utf8')) as Pack };
});
const byId = (id: string) => shipped.find((s) => s.entry.id === id)!;

/**
 * Where cpfair and `detect()` disagree on a nūn, mīm, ghunna or qalqala rule, keyed
 * "rule side[ at the end]" with the āyāt.
 */
function differences(pack: Pack): Record<string, string[]> {
  const found: Record<string, string[]> = {};
  for (const sura of pack.suras) {
    for (const aya of sura.ayat) {
      const text = aya.words.map((w) => w.t).join(' ');
      const starts: number[] = [];
      let offset = 0;
      for (const w of aya.words) {
        starts.push(offset);
        offset += w.t.length + 1;
      }
      const wordAt = (at: number) => starts.findLastIndex((s) => s <= at);
      const engine = new Set(
        detect(text)
          .filter((o) => o.rule !== 'izhar' && o.rule !== 'izhar-shafawi')
          .map((o) => `${wordAt(o.start)}|${o.rule}`)
      );
      const data = new Set<string>();
      aya.words.forEach((w, i) => {
        for (const [, , id, role] of w.r ?? []) {
          const rule = PACK_RULES[id as PackRuleId].rule;
          if (rule && !role) data.add(`${i}|${rule}`);
        }
      });
      for (const key of new Set([...engine, ...data])) {
        if (engine.has(key) && data.has(key)) continue;
        const [word, rule] = key.split('|') as [string, string];
        const side = engine.has(key) ? 'engine' : 'cpfair';
        const last = Number(word) === aya.words.length - 1;
        (found[`${rule} ${side}${last ? ' at the end' : ''}`] ??= []).push(
          `${sura.sura}:${aya.aya}`
        );
      }
    }
  }
  return found;
}

/** cpfair's madd categories the engine names; ʿāriḍ (madd_246) belongs to waqf (unit 7). */
const PACK_MADD: Partial<Record<PackRuleId, RuleId>> = {
  madd_2: 'madd-tabii',
  madd_muttasil: 'madd-muttasil',
  madd_munfasil: 'madd-munfasil',
  madd_6: 'madd-lazim',
};

/**
 * Where cpfair and `detect(text, { madd: true })` disagree on a madd, keyed "rule side" with
 * the words (sūra:āya:word). cpfair marks the natural madd only where a sign writes it (the
 * small alif, wāw or yāʾ), so for it the engine is checked to find at least those.
 */
function maddDifferences(pack: Pack): Record<string, string[]> {
  const found: Record<string, string[]> = {};
  for (const sura of pack.suras) {
    for (const aya of sura.ayat) {
      const text = aya.words.map((w) => w.t).join(' ');
      const starts: number[] = [];
      let offset = 0;
      for (const w of aya.words) {
        starts.push(offset);
        offset += w.t.length + 1;
      }
      const wordAt = (at: number) => starts.findLastIndex((s) => s <= at);
      const engine = new Set(
        detect(text, { madd: true })
          .filter((o) => isMaddRule(o.rule))
          .map((o) => `${wordAt(o.start)}|${o.rule}`)
      );
      const data = new Set<string>();
      aya.words.forEach((w, i) => {
        for (const [, , id] of w.r ?? []) {
          const rule = PACK_MADD[id as PackRuleId];
          if (rule) data.add(`${i}|${rule}`);
        }
      });
      for (const key of new Set([...engine, ...data])) {
        if (engine.has(key) && data.has(key)) continue;
        const [word, rule] = key.split('|') as [string, string];
        if (rule === 'madd-tabii' && engine.has(key)) continue;
        const side = engine.has(key) ? 'engine' : 'cpfair';
        (found[`${rule} ${side}`] ??= []).push(
          `${sura.sura}:${aya.aya}:${Number(word) + 1}`
        );
      }
    }
  }
  return found;
}

describe('the packs in the app', () => {
  it('are the files their index names, byte for byte, with the sources credited', () => {
    expect(shipped.map((s) => s.entry.id)).toEqual(PACKS.map((p) => p.id));
    for (const { entry, bytes, pack } of shipped) {
      expect(bytes.length, entry.id).toBe(entry.bytes);
      expect(createHash('sha256').update(bytes).digest('hex'), entry.id).toBe(
        entry.sha256
      );
      // Each text travels with its own notice: Tanzil's copyright block, DigitalKhatt's MIT.
      if (pack.script === 'uthmani') {
        expect(pack.sources.map((s) => s.licence)).toEqual([
          'CC BY 3.0, verbatim copies only',
          'CC BY 4.0',
        ]);
        expect(pack.copyright).toContain(
          'PLEASE DO NOT REMOVE OR CHANGE THIS COPYRIGHT BLOCK'
        );
      } else {
        expect(pack.sources.map((s) => s.licence)).toEqual(['MIT', 'CC BY 4.0']);
        expect(pack.copyright).toMatch(/^MIT License\n\nCopyright \(c\) .* DigitalKhatt/);
      }
    }
  });

  it('hold every āya of their sūras', () => {
    const juz30 = byId('uthmani-hafs-juz30').pack;
    expect(juz30.suras.map((s) => s.sura)).toEqual(
      Array.from({ length: 37 }, (_, i) => 78 + i)
    );
    expect(juz30.suras.reduce((n, s) => n + s.ayat.length, 0)).toBe(564);
    // ʿAyn, fatḥa, mīm, shadda, fatḥa: Tanzil's order of the marks.
    expect(juz30.suras[0]!.ayat[0]!.words[0]!.t).toBe('\u0639\u064E\u0645\u0651\u064E');
    const baqara = byId('uthmani-hafs-fatiha-baqara').pack;
    expect(baqara.suras.map((s) => [s.sura, s.ayat.length])).toEqual([
      [1, 7],
      [2, 286],
    ]);
    // al-Fātiḥa's basmala is its first āya; al-Baqara's stands before it.
    expect(baqara.suras[0]!.basmala).toBeUndefined();
    expect(baqara.suras[1]!.basmala).toHaveLength(4);
  });

  it('carry the rules onto the right letters, also where Tanzil changed since 2017', () => {
    const baqara = byId('uthmani-hafs-fatiha-baqara').pack.suras[1]!;
    const spans = (aya: number, word: number) => {
      const w = baqara.ayat[aya - 1]!.words[word - 1]!;
      // Rule and the letter it starts on (marks left out: their order is Tanzil's, not ours).
      return (w.r ?? []).map(
        ([s, , rule, role]) => `${rule}${role ? '(f)' : ''}=${w.t[s]}`
      );
    };
    // al-Baqara 2, after two pause signs (since 2017 written with spaces): hudan li-l-muttaqīn.
    expect(spans(2, 6)).toEqual(['idghaam_no_ghunnah=د', 'idghaam_no_ghunnah(f)=ى']);
    expect(spans(2, 7)).toEqual(['idghaam_no_ghunnah(f)=ل', 'madd_246=ي']);
    // al-Baqara 4, after wa-bi-l-ākhirati (its hamza on a tatweel since 2017): the madd of the
    // last word still sits on its wāw.
    expect(spans(4, 10)).toEqual(['hamzat_wasl=ٱ']);
    expect(spans(4, 12)).toEqual(['madd_246=و']);
    expect(spans(4, 9)).toEqual(['ikhfa(f)=ق', 'qalqalah=ب']);
  });

  it('split their āyāt into as many words as @arda/quran counts (the API checks by them)', () => {
    for (const { pack } of shipped) {
      for (const s of pack.suras) {
        for (const a of s.ayat) {
          expect(a.words.length, `${s.sura}:${a.aya}`).toBe(wordCount(s.sura, a.aya));
        }
      }
    }
  });

  it('agree with the engine on every nūn and mīm rule (ADR-0008)', () => {
    // cpfair also marks qalqala on the last letter when stopping, which the engine leaves to
    // unit 7 (waqf); and the engine sees a mīm with shadda at the start of an āya as ghunna
    // where cpfair leaves it to the idghām from the āya before. Nothing else differs.
    const juz30 = differences(byId('uthmani-hafs-juz30').pack);
    expect(Object.keys(juz30).sort()).toEqual([
      'ghunna-mushaddad engine',
      'qalqala cpfair at the end',
    ]);
    expect(juz30['ghunna-mushaddad engine']).toEqual(['80:14', '80:32', '81:21']);
    const baqara = differences(byId('uthmani-hafs-fatiha-baqara').pack);
    expect(Object.keys(baqara).sort()).toEqual([
      'ghunna-mushaddad engine',
      'qalqala cpfair at the end',
    ]);
    expect(baqara['ghunna-mushaddad engine']).toEqual(['2:105', '2:245', '2:261']);
  });

  it('agree with the engine on every madd but the ʿāriḍ (ADR-0008, unit 5)', () => {
    // The engine reads the madd of the vocative yā and the hā of attention as separated
    // (munfaṣil ḥukmī) where cpfair calls it joined (هَٰٓؤُلَآءِ keeps its second, joined madd);
    // and it leaves the opening letters of al-Baqara (الٓمٓ, six counts) to the cards.
    // Nothing else differs.
    const juz30 = maddDifferences(byId('uthmani-hafs-juz30').pack);
    expect(juz30).toEqual({ 'madd-munfasil engine': ['83:32:5'] });
    const baqara = maddDifferences(byId('uthmani-hafs-fatiha-baqara').pack);
    expect(baqara).toEqual({
      'madd-lazim cpfair': ['2:1:1'],
      'madd-munfasil engine': ['2:31:12', '2:33:2', '2:35:2', '2:85:3'],
      'madd-muttasil cpfair': ['2:33:2', '2:35:2'],
    });
  });
});

describe('the IndoPak packs (S2.2)', () => {
  const pairs = [
    ['indopak-hafs-fatiha-baqara', 'uthmani-hafs-fatiha-baqara'],
    ['indopak-hafs-juz30', 'uthmani-hafs-juz30'],
  ] as const;
  const wordsOf = (s: Pack['suras'][number]) => [
    ...(s.basmala ?? []),
    ...s.ayat.flatMap((a) => a.words),
  ];
  const rulesOf = (w: PackWord) =>
    (w.r ?? []).map(([, , id, role]) => `${id}${role ?? ''}`).sort();

  it('have the same āyāt and word keys as the ʿUthmānī text, and every rule', () => {
    for (const [indopak, uthmani] of pairs) {
      const ip = byId(indopak).pack;
      const ut = byId(uthmani).pack;
      expect(ip.script).toBe('indopak');
      expect(ip.suras.map((s) => s.ayat.map((a) => a.words.length))).toEqual(
        ut.suras.map((s) => s.ayat.map((a) => a.words.length))
      );
      ip.suras.forEach((s, i) => {
        const theirs = wordsOf(ut.suras[i]!);
        // The same rules on the same word, carried letter by letter.
        wordsOf(s).forEach((w, k) => {
          expect(rulesOf(w), `${s.sura}: ${w.t}`).toEqual(rulesOf(theirs[k]!));
        });
      });
    }
  });

  it('place every word on a 15-line page, in reading order', () => {
    for (const [indopak] of pairs) {
      const { pack } = byId(indopak);
      expect(pack.layout).toEqual({
        name: 'IndoPak, 15 lines (DigitalKhatt)',
        pages: 610,
        lines: 15,
        pageOffset: 1,
      });
      let last = 0;
      for (const s of pack.suras) {
        for (const w of wordsOf(s)) {
          const [page, line] = w.at!;
          expect(line).toBeGreaterThanOrEqual(1);
          expect(line).toBeLessThanOrEqual(15);
          expect(page * 100 + line).toBeGreaterThanOrEqual(last);
          last = page * 100 + line;
        }
      }
    }
  });

  it('break pages where the sheikh’s copy does (pages 6, 7, 597 and 598)', () => {
    const baqara = byId('indopak-hafs-fatiha-baqara').pack;
    const juz30 = byId('indopak-hafs-juz30').pack;
    const printed = (pack: Pack, sura: number, aya: number, word: 'first' | 'last') => {
      const words = pack.suras.find((s) => s.sura === sura)!.ayat[aya - 1]!.words;
      const w = word === 'first' ? words[0]! : words.at(-1)!;
      return w.at![0] + pack.layout!.pageOffset;
    };
    expect(printed(baqara, 2, 23, 'last')).toBe(5);
    expect(printed(baqara, 2, 24, 'first')).toBe(6);
    expect(printed(baqara, 2, 29, 'last')).toBe(6);
    expect(printed(baqara, 2, 30, 'first')).toBe(7);
    expect(printed(baqara, 2, 37, 'last')).toBe(7);
    expect(printed(juz30, 85, 14, 'first')).toBe(597);
    expect(printed(juz30, 86, 17, 'last')).toBe(597);
    expect(printed(juz30, 87, 1, 'first')).toBe(598);
    expect(printed(juz30, 88, 7, 'last')).toBe(598);
    // Al-Aʿlā's heading is the first line of the sheikh's page 598.
    expect(juz30.suras.find((s) => s.sura === 87)!.at).toEqual([597, 1]);
  });

  it('colour the same letters as the ʿUthmānī text', () => {
    const baqara = byId('indopak-hafs-fatiha-baqara').pack.suras[1]!;
    const spans = (aya: number, word: number) => {
      const w = baqara.ayat[aya - 1]!.words[word - 1]!;
      return (w.r ?? []).map(
        ([s, , rule, role]) => `${rule}${role ? '(f)' : ''}=${w.t[s]}`
      );
    };
    // Al-Baqara 2: hudan li-l-muttaqīn, the tanwīn merging into the lām without ghunna.
    expect(spans(2, 6)).toEqual(['idghaam_no_ghunnah=د', 'idghaam_no_ghunnah(f)=ي']);
    expect(spans(2, 7)).toEqual(['idghaam_no_ghunnah(f)=ل', 'madd_246=ي']);
  });
});

const cache = fileURLToPath(new URL('../.cache/', import.meta.url));
const sources = JSON.parse(
  readFileSync(fileURLToPath(new URL('../sources.json', import.meta.url)), 'utf8')
) as Record<string, { file: string }>;
const haveSources = Object.values(sources).every((s) => existsSync(`${cache}${s.file}`));

describe.skipIf(!haveSources)('rebuilding from the pinned sources', () => {
  it('gives the packs in the app, byte for byte', () => {
    const read = (id: string) => readFileSync(`${cache}${sources[id]!.file}`, 'utf8');
    const credited = shipped.flatMap((s) => s.pack.sources);
    const inputs = {
      tanzil: parseTanzil(read('tanzil-uthmani')),
      annotations: parseCpfair(read('cpfair-tajweed')),
      indopak: parseIndopak(read('digitalkhatt-indopak')),
      sources: [...new Map(credited.map((s) => [s.id, s])).values()],
      digitalkhattNotice: readFileSync(
        fileURLToPath(new URL('../licences/digitalkhatt-js-MIT.txt', import.meta.url)),
        'utf8'
      ),
    };
    for (const spec of PACKS) {
      const { entry } = byId(spec.id);
      expect(serialise(buildSpec(spec, inputs)).sha256, spec.id).toBe(entry.sha256);
    }
  });

  it('gives the words per āya in @arda/quran, unchanged', () => {
    const tanzil = parseTanzil(
      readFileSync(`${cache}${sources['tanzil-uthmani']!.file}`, 'utf8')
    );
    const file = fileURLToPath(
      new URL('../../packages/quran/src/words.ts', import.meta.url)
    );
    expect(countsModule(wordCounts(tanzil))).toBe(readFileSync(file, 'utf8'));
  });

  it('gives the Madīna pages in @arda/quran, unchanged', () => {
    const metadata = readFileSync(`${cache}${sources['tanzil-metadata']!.file}`, 'utf8');
    const file = fileURLToPath(
      new URL('../../packages/quran/src/pages.ts', import.meta.url)
    );
    expect(pagesModule(madinaPageStarts(metadata))).toBe(readFileSync(file, 'utf8'));
  });

  it('gives the reciters’ word timings in the app, unchanged', () => {
    for (const reciter of TIMED_RECITERS) {
      const source = sources[reciter.from] as {
        file: string;
        sha256: string;
        licence: string;
        attribution: string;
      };
      const archive = readFileSync(`${cache}${source.file}`);
      expect(createHash('sha256').update(archive).digest('hex')).toBe(source.sha256);
      const credit = { licence: source.licence, attribution: source.attribution };
      const file = unzipFile(archive, reciter.file);
      const timings =
        reciter.from === 'quran-align'
          ? buildTimings(file.toString('utf8'), reciter, shippedSuras(), credit)
          : buildSurahTimings(
              gunzipSync(file).toString('utf8'),
              reciter,
              shippedSuras(),
              credit
            );
      const shipped = fileURLToPath(
        new URL(`../../apps/web/public/audio/timings/${reciter.id}.json`, import.meta.url)
      );
      expect(serialiseTimings(timings)).toBe(readFileSync(shipped, 'utf8'));
    }
  });

  it('starts the ajzāʾ in @arda/quran where Tanzil’s metadata does', () => {
    const metadata = readFileSync(`${cache}${sources['tanzil-metadata']!.file}`, 'utf8');
    expect(JUZ_STARTS).toEqual(juzStarts(metadata));
  });
});
