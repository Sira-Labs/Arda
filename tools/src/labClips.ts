/**
 * Where a lab word really sounds in al-Ḥuṣarī's teaching recitation (spec F5). The word timings
 * (quran-align) start a word at its first vowel and often end the āya's last word early, so a
 * sīn's hiss, the soft start of a whistling letter, and a word's last syllable were cut off
 * (owner, 2026-10-06: "das Sīn wird oft abgeschnitten", سِجِّيلٍ). The bounds here are found in
 * the sound itself: back to the silence before the word when there is one close by, forward to
 * the silence after the āya's last word.
 */

/** One frame of the loudness envelope, in milliseconds. */
export const FRAME_MS = 10;

/** How far before the timed start a quiet onset (a hiss) is looked for. */
const LOOK_BACK_MS = 300;
/** Frames below the silence level that make a pause. */
const PAUSE_FRAMES = 3;
/** A pause after the āya's last word, so a short stop inside it is not taken for its end. */
const END_PAUSE_FRAMES = 15;
/** How far after the timed end the āya's last word may still sound. */
const LOOK_AHEAD_LAST_MS = 1500;
/** How far after the timed end any other word may still sound (up to a pause). */
const LOOK_AHEAD_MS = 300;
/** Played before the onset and after the end, so the first and last sound are whole. */
const PRE_ROLL_MS = 30;
const TAIL_MS = 60;
/** Silence: below this share of the āya's loud level (95th percentile). */
const SILENCE = 0.025;

/** RMS loudness of 16-bit mono PCM, one value per frame. */
export function envelope(pcm: Int16Array, sampleRate: number): Float64Array {
  const hop = Math.round((sampleRate * FRAME_MS) / 1000);
  const frames = Math.floor(pcm.length / hop);
  const out = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) sum += pcm[i]! * pcm[i]!;
    out[f] = Math.sqrt(sum / hop);
  }
  return out;
}

/**
 * The word's bounds in milliseconds: never later than the timed start nor earlier than the
 * timed end, so a clip only ever grows.
 */
export function wordBounds(
  loudness: Float64Array,
  timed: readonly [number, number],
  last: boolean
): [number, number] {
  const sorted = [...loudness].sort((a, b) => a - b);
  const loud = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  const silent = (f: number) => (loudness[f] ?? 0) < loud * SILENCE;
  const at = (ms: number) =>
    Math.min(loudness.length - 1, Math.max(0, Math.floor(ms / FRAME_MS)));

  // Start: the nearest pause before the timed start; the word's sound begins after it.
  let start = timed[0] - PRE_ROLL_MS;
  const first = at(timed[0]);
  for (
    let f = first - 1, quiet = 0;
    f >= Math.max(0, first - LOOK_BACK_MS / FRAME_MS);
    f--
  ) {
    quiet = silent(f) ? quiet + 1 : 0;
    if (quiet >= PAUSE_FRAMES) {
      let onset = f + quiet;
      while (onset < first && silent(onset)) onset++;
      start = Math.min(start, onset * FRAME_MS - PRE_ROLL_MS);
      break;
    }
  }

  // End: the next pause after the timed end (a longer one after the āya's last word).
  let end = timed[1] + TAIL_MS;
  const close = at(timed[1]);
  const need = last ? END_PAUSE_FRAMES : PAUSE_FRAMES;
  const ahead = (last ? LOOK_AHEAD_LAST_MS : LOOK_AHEAD_MS) / FRAME_MS;
  for (let f = close, quiet = 0; f < Math.min(loudness.length, close + ahead); f++) {
    quiet = silent(f) ? quiet + 1 : 0;
    if (quiet >= need) {
      end = Math.max(end, (f - quiet + 1) * FRAME_MS + TAIL_MS);
      break;
    }
  }
  return [Math.max(0, start), end];
}

/** The measured bounds of every lab word, `sura:aya:n` → [start, end] in milliseconds. */
export interface LabClips {
  reciter: string;
  audio: string;
  note: string;
  clips: Record<string, [number, number]>;
}

/** `tools/lab-clips.json`, keys in the picks' order, one per line. */
export function serialiseClips(clips: LabClips): string {
  const lines = Object.entries(clips.clips).map(
    ([key, [start, end]]) => `    ${JSON.stringify(key)}: [${start}, ${end}]`
  );
  return `{
  "reciter": ${JSON.stringify(clips.reciter)},
  "audio": ${JSON.stringify(clips.audio)},
  "note": ${JSON.stringify(clips.note)},
  "clips": {
${lines.join(',\n')}
  }
}
`;
}
