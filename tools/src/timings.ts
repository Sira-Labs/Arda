import { wordCount } from '@arda/quran';
import { PACKS } from './packs';

/**
 * Word timings for the reciters the player marks word by word (ADR-0011), kept for the sūras
 * the app ships. A word is a word of the Tanzil ʿUthmānī text split by spaces, as in the
 * packs, so a segment's word numbers are the word keys' (0-based, from `from` up to `to`).
 *
 * - quran-align (CC BY 4.0) times EveryAyah's āya-by-āya recordings of al-Ḥuṣarī: one file
 *   per āya, times from its start.
 * - Quranic Universal Audio (CC BY 4.0) times QuranicAudio's sūra-by-sūra recording of Māhir
 *   al-Muʿayqilī: one file per sūra, so each āya also has its span within the file.
 */
export const TIMED_RECITERS: readonly TimedReciter[] = [
  { id: 'husary-muallim', from: 'quran-align', file: 'Husary_Muallim_128kbps.json' },
  { id: 'husary', from: 'quran-align', file: 'Husary_64kbps.json' },
  {
    id: 'maher',
    from: 'qua-maher',
    file: 'word_timestamps.json.gz',
    audio: 'https://download.quranicaudio.com/quran/maher_almu3aiqly/year1440/',
  },
];

export interface TimedReciter {
  /** The app's reciter id, and the output file's name. */
  id: string;
  /** The pinned source (sources.json) the timings come from. */
  from: 'quran-align' | 'qua-maher';
  /**
   * The file in the source's archive. quran-align names it after the EveryAyah folder it was
   * aligned to.
   */
  file: string;
  /** Sūra by sūra: where the recordings are, `NNN.mp3` per sūra. */
  audio?: string;
}

/** [first word, word after the last (0-based), start ms, end ms] in the recording. */
export type Segment = [from: number, to: number, startMs: number, endMs: number];

export interface Timings {
  format: 1;
  reciter: string;
  /** One recording per āya, or per sūra. */
  by: 'aya' | 'sura';
  /** The EveryAyah folder (by āya), or the address the sūras' files are under (by sūra). */
  audio: string;
  licence: string;
  attribution: string;
  /** Segments per āya, keyed `sura:aya`, in time order. */
  ayat: Record<string, Segment[]>;
  /** By sūra: where each āya starts and ends in its sūra's recording. */
  spans?: Record<string, [startMs: number, endMs: number]>;
}

type Credit = { licence: string; attribution: string };

/** The sūras the packs hold, in order. */
export const shippedSuras = (): number[] =>
  [...new Set(PACKS.flatMap((p) => range(p.fromSura, p.toSura)))].sort((a, b) => a - b);

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const isCount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;

/** A segment checked against its āya: inside its words, not running backwards. */
function checkSegment(file: string, key: string, words: number, s: unknown): Segment {
  if (!Array.isArray(s) || s.length !== 4 || !s.every(isCount)) {
    throw new Error(`${file}: malformed segment in ${key}`);
  }
  const [from, to, start, end] = s as Segment;
  if (from >= to || to > words || start > end) {
    throw new Error(`${file}: segment ${s.join(',')} does not fit ${key}`);
  }
  return [from, to, start, end];
}

/** Every āya of `suras` in order, each with what `found` has for it, or a failure. */
function everyAya<T>(
  file: string,
  suras: readonly number[],
  found: Map<string, T>
): [string, T][] {
  const out: [string, T][] = [];
  for (const sura of suras) {
    for (let aya = 1; wordCount(sura, aya) !== undefined; aya++) {
      const value = found.get(`${sura}:${aya}`);
      if (value === undefined) throw new Error(`${file}: no timings for ${sura}:${aya}`);
      out.push([`${sura}:${aya}`, value]);
    }
  }
  return out;
}

/** quran-align's timings of one reciter's EveryAyah recordings, for `suras`. */
export function buildTimings(
  raw: string,
  reciter: TimedReciter,
  suras: readonly number[],
  credit: Credit
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
    const key = `${surah}:${ayah}`;
    const words = wordCount(surah, ayah);
    if (words === undefined) throw new Error(`${reciter.file}: no āya ${key}`);
    const checked = segments.map((s) => checkSegment(reciter.file, key, words, s));
    byAya.set(
      key,
      checked.sort((a, b) => a[2] - b[2])
    );
  }
  return {
    format: 1,
    reciter: reciter.id,
    by: 'aya',
    audio: reciter.file.replace(/\.json$/, ''),
    ...credit,
    ayat: Object.fromEntries(everyAya(reciter.file, suras, byAya)),
  };
}

/** A row of Quranic Universal Audio's word tier: the āya, its span, and its words in order. */
type QuaRow = [
  ref: string,
  start: number,
  end: number,
  canonical: boolean,
  silence: number,
  words: [number, number, number][],
];

/**
 * Quranic Universal Audio's timings of a sūra-by-sūra recording, for `suras`. Its words are
 * counted from 1 and listed as recited: a word the reciter repeats appears again, later.
 */
export function buildSurahTimings(
  raw: string,
  reciter: TimedReciter,
  suras: readonly number[],
  credit: Credit
): Timings {
  const data = JSON.parse(raw) as { _meta?: { tier?: unknown }; rows?: unknown };
  if (data._meta?.tier !== 'word' || !Array.isArray(data.rows)) {
    throw new Error(`${reciter.file}: not a word tier`);
  }
  const wanted = new Set(suras);
  const segments = new Map<string, Segment[]>();
  const spans = new Map<string, [number, number]>();
  for (const row of data.rows as QuaRow[]) {
    const [ref, start, end, , , words] = row;
    const [sura, aya] = String(ref).split(':').map(Number);
    if (!isCount(sura) || !isCount(aya) || !isCount(start) || !isCount(end)) {
      throw new Error(`${reciter.file}: malformed row ${String(ref)}`);
    }
    if (!wanted.has(sura)) continue;
    const count = wordCount(sura, aya);
    if (count === undefined || !Array.isArray(words)) {
      throw new Error(`${reciter.file}: no āya ${ref}`);
    }
    if (start > end) throw new Error(`${reciter.file}: ${ref} ends before it starts`);
    const checked = words.map(([n, from, to]) =>
      checkSegment(reciter.file, ref, count, [n - 1, n, from, to])
    );
    // A word timed outside its āya's span belongs to another āya.
    if (checked.some(([, , from, to]) => from < start || to > end)) {
      throw new Error(`${reciter.file}: a word of ${ref} lies outside its āya`);
    }
    segments.set(ref, checked);
    spans.set(ref, [start, end]);
  }
  return {
    format: 1,
    reciter: reciter.id,
    by: 'sura',
    audio: reciter.audio!,
    ...credit,
    ayat: Object.fromEntries(everyAya(reciter.file, suras, segments)),
    spans: Object.fromEntries(everyAya(reciter.file, suras, spans)),
  };
}

/** The file as written: one āya per line, so a changed timing shows as a one-line diff. */
export function serialiseTimings(timings: Timings): string {
  const { ayat, spans, ...head } = timings;
  const block = (name: string, entries: Record<string, unknown>) =>
    `  ${JSON.stringify(name)}: {\n${Object.entries(entries)
      .map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
      .join(',\n')}\n  }`;
  const meta = Object.entries(head).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`
  );
  const blocks = [block('ayat', ayat), ...(spans ? [block('spans', spans)] : [])];
  return `{\n${meta.join('\n')}\n${blocks.join(',\n')}\n}\n`;
}
