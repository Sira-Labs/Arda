import type { RiwayaExample } from '@arda/tajweed';
import type { HeardRiwaya } from './units';

/**
 * ʿAbd al-Bāsiṭ ʿAbd aṣ-Ṣamad's murattal in Ḥafṣ and in Warsh on EveryAyah, one file per āya
 * (ADR-0027): streamed with credit, never stored (ADR-0009 rule 2). Same host as the muṣḥaf's
 * reciters, which media-src allows (Caddyfile).
 */
const FOLDER: Readonly<Record<HeardRiwaya, string>> = {
  hafs: 'https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/',
  warsh: 'https://everyayah.com/data/warsh/warsh_Abdul_Basit_128kbps/',
};

/** The āya of the example as `riwaya` is recited, or `undefined` where it is not heard. */
export function riwayaAudioOf(
  example: RiwayaExample,
  riwaya: HeardRiwaya
): string | undefined {
  const file = example.audio?.[riwaya];
  return file && `${FOLDER[riwaya]}${file}.mp3`;
}

/** Sūra and āya of the example (the Ḥafṣ count, as the learner's muṣḥaf numbers it). */
export function placeOf(example: RiwayaExample): { sura: number; aya: number } {
  const [, sura = 0, aya = 0] = example.wordKey.split(':').map(Number);
  return { sura, aya };
}
