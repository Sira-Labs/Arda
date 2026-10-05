import { storedChoice } from './storedChoice';

/**
 * The reciters the muṣḥaf plays (ADR-0011): al-Ḥuṣarī's teaching recitation (muʿallim, the
 * default), his murattal, and Māhir al-Muʿayqilī (owner, 2026-10-05). The recordings are
 * EveryAyah's, one file per āya, streamed with credit and never stored by the app. Word
 * timings (quran-align) exist for al-Ḥuṣarī's two; Māhir al-Muʿayqilī plays āya by āya.
 */
export const RECITERS = [
  { id: 'husary-muallim', folder: 'Husary_Muallim_128kbps', timed: true },
  { id: 'husary', folder: 'Husary_64kbps', timed: true },
  { id: 'maher', folder: 'MaherAlMuaiqly128kbps', timed: false },
] as const;

export type ReciterId = (typeof RECITERS)[number]['id'];
export type Reciter = (typeof RECITERS)[number];

/** Where EveryAyah serves the recordings; the host is the one media-src allows (Caddyfile). */
export const AUDIO_HOST = 'https://everyayah.com';

const pad = (n: number) => String(n).padStart(3, '0');

/** The recording of one āya; āya 0 is a sūra's basmala, recorded once as al-Fātiḥa 1. */
export const ayaAudio = (reciter: Reciter, sura: number, aya: number): string =>
  aya === 0
    ? `${AUDIO_HOST}/data/${reciter.folder}/001001.mp3`
    : `${AUDIO_HOST}/data/${reciter.folder}/${pad(sura)}${pad(aya)}.mp3`;

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
