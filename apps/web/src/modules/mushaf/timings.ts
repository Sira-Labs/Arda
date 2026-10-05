import type { ReciterId } from './reciters';

/** [first word, word after the last (0-based), start ms, end ms] within an āya's recording. */
export type Segment = readonly [from: number, to: number, startMs: number, endMs: number];

/**
 * One reciter's word timings (quran-align, Quranic Universal Audio; CC BY 4.0), as
 * `npm run timings` writes them.
 */
export interface Timings {
  reciter: string;
  /** One recording per āya (times from its start), or per sūra (times within the sūra). */
  by: 'aya' | 'sura';
  /** Segments per āya, keyed `sura:aya`, in time order. */
  ayat: Record<string, readonly Segment[]>;
  /** By sūra: where each āya starts and ends in its sūra's recording. */
  spans?: Record<string, readonly [number, number]>;
}

export type FetchTimings = (reciter: ReciterId) => Promise<Timings | null>;

const isTimings = (value: unknown): value is Timings =>
  typeof value === 'object' &&
  value !== null &&
  (value as { format?: unknown }).format === 1 &&
  typeof (value as { ayat?: unknown }).ayat === 'object';

/** The timings the app ships next to itself; `null` when they cannot be had (offline). */
export const fetchTimings: FetchTimings = async (reciter) => {
  const response = await fetch(`/audio/timings/${reciter}.json`);
  if (!response.ok) return null;
  const data: unknown = await response.json();
  return isTimings(data) ? data : null;
};

/**
 * The words being recited `ms` into the āya's recording, 1-based and inclusive, or undefined
 * between words (a breath, the pause of the teaching recitation).
 */
export function wordsAt(
  segments: readonly Segment[] | undefined,
  ms: number
): { from: number; to: number } | undefined {
  const segment = segments?.find(([, , start, end]) => ms >= start && ms <= end);
  return segment ? { from: segment[0] + 1, to: segment[1] } : undefined;
}
