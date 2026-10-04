import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PACK_RULES, detect, type PackRuleId } from '@arda/tajweed';
import { parseCpfair } from '../src/cpfair';
import { buildPack, serialise, type Pack, type PackWord } from '../src/pack';
import { parseTanzil } from '../src/tanzil';

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
const index = JSON.parse(readFileSync(`${packs}index.json`, 'utf8')) as {
  packs: { file: string; sha256: string; bytes: number }[];
};
const juz30 = index.packs[0]!;
const bytes = readFileSync(`${packs}${juz30.file}`);
const pack = JSON.parse(bytes.toString('utf8')) as Pack;

describe('the Juzʾ ʿAmma pack in the app', () => {
  it('is the file its index names, byte for byte', () => {
    expect(bytes.length).toBe(juz30.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(juz30.sha256);
  });

  it('has an-Nabaʾ to an-Nās, every āya, with the sources credited', () => {
    expect(pack.suras.map((s) => s.sura)).toEqual(
      Array.from({ length: 37 }, (_, i) => 78 + i)
    );
    expect(pack.suras.reduce((n, s) => n + s.ayat.length, 0)).toBe(564);
    // ʿAyn, fatḥa, mīm, shadda, fatḥa: Tanzil's order of the marks.
    expect(pack.suras[0]!.ayat[0]!.words[0]!.t).toBe('\u0639\u064E\u0645\u0651\u064E');
    expect(pack.sources.map((s) => s.licence)).toEqual([
      'CC BY 3.0, verbatim copies only',
      'CC BY 4.0',
    ]);
    expect(pack.copyright).toContain(
      'PLEASE DO NOT REMOVE OR CHANGE THIS COPYRIGHT BLOCK'
    );
  });

  it('agrees with the engine on every nūn and mīm rule (ADR-0008)', () => {
    const differences: Record<string, string[]> = {};
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
          (differences[`${rule} ${side}${last ? ' at the end' : ''}`] ??= []).push(
            `${sura.sura}:${aya.aya}`
          );
        }
      }
    }
    // cpfair also marks qalqala on the last letter when stopping, which the engine leaves to
    // unit 7 (waqf); and the engine sees a mīm with shadda at the start of an āya as ghunna
    // where cpfair leaves it to the idghām from the āya before. Nothing else differs.
    expect(Object.keys(differences).sort()).toEqual([
      'ghunna-mushaddad engine',
      'qalqala cpfair at the end',
    ]);
    expect(differences['ghunna-mushaddad engine']).toEqual(['80:14', '80:32', '81:21']);
  });
});

const cache = fileURLToPath(new URL('../.cache/', import.meta.url));
const sources = JSON.parse(
  readFileSync(fileURLToPath(new URL('../sources.json', import.meta.url)), 'utf8')
) as Record<string, { file: string }>;
const haveSources = Object.values(sources).every((s) => existsSync(`${cache}${s.file}`));

describe.skipIf(!haveSources)('rebuilding from the pinned sources', () => {
  it('gives the pack in the app, byte for byte', () => {
    const read = (id: string) => readFileSync(`${cache}${sources[id]!.file}`, 'utf8');
    const { pack: rebuilt } = buildPack({
      id: pack.id,
      version: pack.version,
      title: pack.title,
      fromSura: 78,
      toSura: 114,
      tanzil: parseTanzil(read('tanzil-uthmani')),
      annotations: parseCpfair(read('cpfair-tajweed')),
      sources: pack.sources,
    });
    expect(serialise(rebuilt).sha256).toBe(juz30.sha256);
  });
});
