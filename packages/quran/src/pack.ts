/**
 * The format of a content pack (ADR-0010, spec 03 §1), shared by `tools/` that writes packs and
 * the web app that reads them. A word's key is `riwaya:sura:aya:n`, n counting from 1
 * (ADR-0007).
 */

/**
 * A rule on part of a word: `[start, end, rule]` over UTF-16 offsets of the word's text, plus
 * `"f"` when it is the follower of a rule decided by the next letter (shown, not coloured).
 */
export type PackSpan<R extends string = string> =
  [number, number, R] | [number, number, R, 'f'];

export interface PackWord<R extends string = string> {
  /** The word, verbatim from the source. */
  t: string;
  /** Rule spans, in reading order. */
  r?: PackSpan<R>[];
  /** Pause or sajdah signs after the word. */
  a?: string;
}

export interface PackAya<R extends string = string> {
  aya: number;
  words: PackWord<R>[];
}

export interface PackSura<R extends string = string> {
  sura: number;
  name: string;
  /**
   * The basmala before the sūra as the source writes it there; absent for at-Tawba, and for
   * al-Fātiḥa, where it is āya 1.
   */
  basmala?: PackWord<R>[];
  ayat: PackAya<R>[];
}

export interface PackSource {
  id: string;
  title: string;
  url: string;
  licence: string;
  attribution: string;
  sha256: string;
}

export interface Pack<R extends string = string> {
  format: 1;
  id: string;
  version: number;
  script: 'uthmani' | 'indopak';
  riwaya: 'hafs';
  title: string;
  sources: PackSource[];
  /** The text source's copyright block, which travels with every file derived from it. */
  copyright: string;
  suras: PackSura<R>[];
}

/** One entry of `packs/index.json`: where a pack is and how to check it. */
export interface PackIndexEntry {
  id: string;
  version: number;
  file: string;
  sha256: string;
  bytes: number;
  script: Pack['script'];
  riwaya: Pack['riwaya'];
  title: string;
  /** First and last sūra in the pack. */
  suras: [number, number];
  sources: Pick<PackSource, 'id' | 'licence' | 'attribution'>[];
}

export interface PackIndex {
  format: 1;
  packs: PackIndexEntry[];
}

/** The key of word `n` (from 1) of an āya: `hafs:113:2:1`. */
export const wordKey = (riwaya: string, sura: number, aya: number, n: number): string =>
  `${riwaya}:${sura}:${aya}:${n}`;
