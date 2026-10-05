import { wordCount } from '@arda/quran';
import { PACKS } from './packs';

/**
 * Word timings for the reciters the player highlights word by word (ADR-0011): quran-align's
 * data (CC BY 4.0), aligned to EveryAyah's āya-by-āya recordings, kept for the sūras the app
 * ships. A word is a word of the Tanzil ʿUthmānī text split by spaces, as in the packs, so a
 * segment's word numbers are the word keys' (0-based in the source, from `from` up to `to`).
 */
export const TIMED_RECITERS: readonly {
  /** The app's reciter id, and the output file's name. */
  id: string;
  /** The file in the quran-align release; its name is the EveryAyah folder it was aligned to. */
  file: string;
}[] = [
  { id: 'husary-muallim', file: 'Husary_Muallim_128kbps.json' },
  { id: 'husary', file: 'Husary_64kbps.json' },
];

/** [first word, word after the last (0-based), start ms, end ms] in the āya's recording. */
export type Segment = [from: number, to: number, startMs: number, endMs: number];

export interface Timings {
  format: 1;
  reciter: string;
  /** The EveryAyah folder whose recordings the timings belong to. */
  audio: string;
  licence: string;
  attribution: string;
  /** Segments per āya, keyed `sura:aya`. */
  ayat: Record<string, Segment[]>;
}

/** The sūras the packs hold, in order. */
export const shippedSuras = (): number[] =>
  [...new Set(PACKS.flatMap((p) => range(p.fromSura, p.toSura)))].sort((a, b) => a - b);

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const isCount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;

/** One reciter's timings for `suras`, checked against the words of every āya. */
export function buildTimings(
  raw: string,
  reciter: (typeof TIMED_RECITERS)[number],
  suras: readonly number[],
  credit: { licence: string; attribution: string }
): Timings {
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) throw new Error(`${reciter.file}: not a list of āyāt`);
  const wanted = new Set(suras);
  const byAya = new Map<string, Segment[]>();
  for (const entry of data as { surah: unknown; ayah: unknown; segments: unknown }[]) {
    const { surah, ayah, segments } = entry;
    if (!isCount(surah) || !isCount(ayah) || !Array.isArray(segments)) {
      throw new Error(`${reciter.file}: malformed entry`);
    }
    if (!wanted.has(surah)) continue;
    const words = wordCount(surah, ayah);
    if (words === undefined) throw new Error(`${reciter.file}: no āya ${surah}:${ayah}`);
    const checked = (segments as unknown[]).map((s) => {
      if (!Array.isArray(s) || s.length !== 4 || !s.every(isCount)) {
        throw new Error(`${reciter.file}: malformed segment in ${surah}:${ayah}`);
      }
      const [from, to, start, end] = s as Segment;
      // A segment outside the āya's words or running backwards is not a timing of this text.
      if (from >= to || to > words || start > end) {
        throw new Error(
          `${reciter.file}: segment ${s.join(',')} does not fit ${surah}:${ayah}`
        );
      }
      return [from, to, start, end] as Segment;
    });
    byAya.set(
      `${surah}:${ayah}`,
      checked.sort((a, b) => a[2] - b[2])
    );
  }
  const ayat: Record<string, Segment[]> = {};
  for (const sura of suras) {
    for (let aya = 1; wordCount(sura, aya) !== undefined; aya++) {
      const segments = byAya.get(`${sura}:${aya}`);
      if (!segments) throw new Error(`${reciter.file}: no timings for ${sura}:${aya}`);
      ayat[`${sura}:${aya}`] = segments;
    }
  }
  return {
    format: 1,
    reciter: reciter.id,
    audio: reciter.file.replace(/\.json$/, ''),
    ...credit,
    ayat,
  };
}

/** The file as written: one āya per line, so a changed timing shows as a one-line diff. */
export function serialiseTimings(timings: Timings): string {
  const { ayat, ...head } = timings;
  const lines = Object.entries(ayat).map(
    ([key, segments]) => `    ${JSON.stringify(key)}: ${JSON.stringify(segments)}`
  );
  const meta = Object.entries(head).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`
  );
  return `{\n${meta.join('\n')}\n  "ayat": {\n${lines.join(',\n')}\n  }\n}\n`;
}
