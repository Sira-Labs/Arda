import type { Pack, PackSource } from '@arda/quran';
import type { PackRuleId } from '@arda/tajweed';
import type { Annotation } from './cpfair';
import type { IndopakText } from './indopak';
import { buildIndopakPack } from './indopakPack';
import { buildPack } from './pack';
import type { PACKS } from './packs';
import type { TanzilText } from './tanzil';

export interface Inputs {
  tanzil: TanzilText;
  annotations: Map<string, Annotation[]>;
  indopak: IndopakText;
  /** Every pinned source (sources.json), by id. */
  sources: PackSource[];
  /** DigitalKhatt's MIT notice (tools/licences/digitalkhatt-js-MIT.txt). */
  digitalkhattNotice: string;
}

/** The sources each script's packs are made from, as credited in the pack. */
const SOURCES = {
  uthmani: ['tanzil-uthmani', 'cpfair-tajweed'],
  indopak: ['digitalkhatt-indopak', 'cpfair-tajweed'],
} as const;

export const sourcesFor = (script: 'uthmani' | 'indopak', all: readonly PackSource[]) =>
  SOURCES[script].map((id) => {
    const source = all.find((s) => s.id === id);
    if (!source) throw new Error(`no source ${id} in sources.json`);
    return source;
  });

/** One pack of PACKS, built from the pinned sources. */
export function buildSpec(
  spec: (typeof PACKS)[number],
  inputs: Inputs
): Pack<PackRuleId> {
  if (spec.script === 'uthmani') {
    return buildPack({
      ...spec,
      ...inputs,
      sources: sourcesFor('uthmani', inputs.sources),
    }).pack;
  }
  // The rules come from the ʿUthmānī text of the same sūras (cpfair annotates Tanzil).
  const { pack: uthmani } = buildPack({ ...spec, ...inputs, sources: [] });
  return buildIndopakPack({
    id: spec.id,
    version: spec.version,
    title: spec.title,
    uthmani,
    indopak: inputs.indopak,
    sources: sourcesFor('indopak', inputs.sources),
    copyright: inputs.digitalkhattNotice,
  }).pack;
}
