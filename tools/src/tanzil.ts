import { createHash } from 'node:crypto';

/** A Tanzil text file ("sura|aya|text" lines and a copyright block), parsed. */
export interface TanzilText {
  /** "sura:aya" → the āya's text, verbatim. */
  ayat: Map<string, string>;
  /** The copyright block, which must travel with every derived file (Tanzil terms). */
  copyright: string;
  /** SHA-256 of the āya lines only: the year in the copyright block changes, the text not. */
  textSha256: string;
}

export function parseTanzil(raw: string): TanzilText {
  const ayat = new Map<string, string>();
  const textLines: string[] = [];
  const copyright: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith('#')) {
      copyright.push(line);
      continue;
    }
    if (!line.trim()) continue;
    const match = /^(\d{1,3})\|(\d{1,3})\|(.+)$/.exec(line);
    if (!match)
      throw new Error(`Tanzil: unexpected line ${JSON.stringify(line.slice(0, 40))}`);
    ayat.set(`${match[1]}:${match[2]}`, match[3]!);
    textLines.push(line);
  }
  if (!copyright.some((line) => line.includes('Tanzil'))) {
    throw new Error('Tanzil: the copyright block is missing');
  }
  return {
    ayat,
    copyright: copyright.join('\n'),
    textSha256: createHash('sha256').update(textLines.join('\n')).digest('hex'),
  };
}
