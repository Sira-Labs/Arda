import { storedChoice } from './storedChoice';

/** Where the recordings are; each host is one media-src allows (Caddyfile). */
const EVERYAYAH = 'https://everyayah.com/data';
const QURANICAUDIO = 'https://download.quranicaudio.com/quran';

/**
 * The reciters the muṣḥaf plays (ADR-0011), streamed with credit and never stored by the app,
 * each marked word by word: al-Ḥuṣarī's teaching recitation (muʿallim, the default) and his
 * murattal, EveryAyah's one file per āya timed by quran-align; and Māhir al-Muʿayqilī (owner,
 * 2026-10-05), QuranicAudio's one file per sūra timed by Quranic Universal Audio.
 */
export const RECITERS = [
  { id: 'husary-muallim', by: 'aya', audio: `${EVERYAYAH}/Husary_Muallim_128kbps/` },
  { id: 'husary', by: 'aya', audio: `${EVERYAYAH}/Husary_64kbps/` },
  { id: 'maher', by: 'sura', audio: `${QURANICAUDIO}/maher_almu3aiqly/year1440/` },
] as const;

export type ReciterId = (typeof RECITERS)[number]['id'];
export type Reciter = (typeof RECITERS)[number];

/** Where an āya is heard: a file, from `start` to `end` (ms; to the file's end without one). */
export interface Recording {
  src: string;
  start: number;
  end?: number;
}

const pad = (n: number) => String(n).padStart(3, '0');

/**
 * The recording of an āya; āya 0 is a sūra's basmala. By āya, the basmala is recorded once,
 * as al-Fātiḥa 1; by sūra, it is what precedes the sūra's first āya in its file. A reciter
 * recorded by sūra needs the āyāt's spans (its timings); without them there is none.
 */
export function recordingOf(
  reciter: Reciter,
  sura: number,
  aya: number,
  spans?: Readonly<Record<string, readonly [number, number]>>
): Recording | null {
  if (reciter.by === 'aya') {
    return {
      src: `${reciter.audio}${aya === 0 ? '001001' : pad(sura) + pad(aya)}.mp3`,
      start: 0,
    };
  }
  const span = spans?.[`${sura}:${aya === 0 ? 1 : aya}`];
  if (!span) return null;
  const src = `${reciter.audio}${pad(sura)}.mp3`;
  return aya === 0
    ? { src, start: 0, end: span[0] }
    : { src, start: span[0], end: span[1] };
}

export const reciterOf = (id: ReciterId): Reciter => RECITERS.find((r) => r.id === id)!;

const reciterChoice = storedChoice<ReciterId>(
  'arda.reciter',
  'husary-muallim',
  RECITERS.map((r) => r.id)
);
export const chooseReciter = reciterChoice.choose;
export const useReciter = reciterChoice.use;
export const resetReciterForTests = reciterChoice.resetForTests;

/** Playback speeds (spec F4: 0.5×–1×). */
export const SPEEDS = ['0.5', '0.75', '1'] as const;
export type Speed = (typeof SPEEDS)[number];

const speedChoice = storedChoice<Speed>('arda.speed', '1', SPEEDS);
export const chooseSpeed = speedChoice.choose;
export const useSpeed = speedChoice.use;
export const resetSpeedForTests = speedChoice.resetForTests;
