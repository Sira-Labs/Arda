/**
 * The click of the practice beat: a short tone made in the browser, no recording. Absent
 * where the browser has no Web Audio (and in tests): the beat is then shown only.
 */
export interface BeatSound {
  /** One click; the first beat of a bar a little higher. */
  tick(accent: boolean): void;
  close(): void;
}

const CLICK_SECONDS = 0.04;

/** Starts the sound; call it from a tap, as browsers only then let a page make sound. */
export function createBeatSound(): BeatSound | null {
  const Context =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext);
  if (!Context) return null;
  let context: AudioContext;
  try {
    context = new Context();
  } catch {
    return null;
  }
  return {
    tick(accent) {
      const start = context.currentTime;
      const tone = context.createOscillator();
      const volume = context.createGain();
      tone.frequency.value = accent ? 990 : 660;
      volume.gain.setValueAtTime(0.25, start);
      volume.gain.exponentialRampToValueAtTime(0.001, start + CLICK_SECONDS);
      tone.connect(volume).connect(context.destination);
      tone.start(start);
      tone.stop(start + CLICK_SECONDS);
    },
    close() {
      void context.close().catch(() => undefined);
    },
  };
}
