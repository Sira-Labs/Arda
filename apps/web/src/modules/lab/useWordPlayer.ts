import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { logger } from '@/services/logger';
import { reciterOf, recordingOf, useSpeed } from '../mushaf/reciters';
import type { Timings } from '../mushaf/timings';
import { PlayerContext } from '../mushaf/usePlayer';
import { LAB_PAIRS, LAB_WORDS } from './words';

const log = logger.child('lab-player');

/** The lab always plays al-Ḥuṣarī's teaching recitation: slow and clear, word by word. */
export const LAB_RECITER = reciterOf('husary-muallim');

/** The pause between two words played one after the other (a pair). */
const GAP_MS = 700;

/** Where a word is heard: its āya's file, from its first to its last millisecond. */
export interface WordClip {
  src: string;
  start: number;
  end: number;
}

/** The lab's words by key, with where each really sounds. */
const MEASURED = new Map(
  [...LAB_WORDS, ...LAB_PAIRS.flatMap((pair) => pair.words)].map((w) => [w.key, w.clip])
);

/**
 * The clip of `hafs:sura:aya:n` in the teaching recitation, when the word is timed alone: the
 * measured bounds of a lab word (its whole first and last sound), else its timing.
 */
export function clipOf(
  key: string,
  timings: Timings | null | undefined
): WordClip | null {
  const [, sura, aya, n] = key.split(':').map(Number);
  if (!sura || !aya || !n || !timings) return null;
  const segment = timings.ayat[`${sura}:${aya}`]?.find(
    ([from, to]) => from === n - 1 && to === n
  );
  const recording = recordingOf(LAB_RECITER, sura, aya);
  if (!segment || !recording) return null;
  const [start, end] = MEASURED.get(key) ?? [segment[2], segment[3]];
  return { src: recording.src, start, end };
}

/** Moves to `ms`, once the browser knows the file if it does not yet. */
function seek(audio: HTMLAudioElement, ms: number) {
  if (audio.readyState >= 1) {
    audio.currentTime = ms / 1000;
    return;
  }
  audio.addEventListener('loadedmetadata', () => (audio.currentTime = ms / 1000), {
    once: true,
  });
}

/**
 * Plays single words of the teaching recitation (spec F5): the āya's file from the word's
 * start to its end, at the chosen speed (shared with the muṣḥaf), one word or a few in turn
 * with a short pause. Uses the muṣḥaf player's audio and timings (PlayerContext), so tests
 * hand in a fake.
 */
export function useWordPlayer() {
  const deps = useContext(PlayerContext);
  const speed = Number(useSpeed());
  // undefined while loading, null when the timings cannot be had (offline).
  const [timings, setTimings] = useState<Timings | null | undefined>(undefined);
  const [playing, setPlaying] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const end = useRef<number | null>(null);
  const queue = useRef<readonly string[]>([]);
  const gap = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef({ timings, speed });
  latest.current = { timings, speed };

  useEffect(() => {
    let live = true;
    deps
      .fetchTimings(LAB_RECITER.id)
      .catch((error: unknown) => {
        log.debug('timings unavailable', { error: String(error) });
        return null;
      })
      .then((data) => {
        if (live) setTimings(data);
      });
    return () => {
      live = false;
    };
  }, [deps]);

  /** Starts one word; false when it cannot be played. */
  const start = useRef((_key: string): boolean => false);
  start.current = (key: string) => {
    const audio = audioRef.current;
    const clip = clipOf(key, latest.current.timings);
    if (!audio || !clip) {
      log.debug('no clip for the word', { key });
      setFailed(true);
      setPlaying(null);
      return false;
    }
    if (audio.src !== clip.src) audio.src = clip.src;
    audio.defaultPlaybackRate = latest.current.speed;
    audio.playbackRate = latest.current.speed;
    seek(audio, clip.start);
    end.current = clip.end;
    setFailed(false);
    setPlaying(key);
    audio.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      log.debug('recitation did not start', { error: String(error) });
      setFailed(true);
      setPlaying(null);
    });
    return true;
  };

  /** The word is over: the next one after a pause, or done. */
  const finish = useRef(() => {});
  finish.current = () => {
    const audio = audioRef.current;
    if (end.current === null || !audio) return;
    end.current = null;
    audio.pause();
    const [next, ...rest] = queue.current;
    queue.current = rest;
    if (next === undefined) {
      setPlaying(null);
      return;
    }
    gap.current = setTimeout(() => {
      gap.current = undefined;
      start.current(next);
    }, GAP_MS);
  };
  const reachEnd = useRef(() => {});
  reachEnd.current = () => {
    const audio = audioRef.current;
    if (audio && end.current !== null && audio.currentTime * 1000 >= end.current) {
      finish.current();
    }
  };

  // One audio element for the screen's life.
  useEffect(() => {
    const audio = deps.createAudio();
    audioRef.current = audio;
    const onTime = () => reachEnd.current();
    const onEnded = () => finish.current();
    const onError = () => {
      log.debug('recitation failed to load', { src: audio.src });
      end.current = null;
      queue.current = [];
      setFailed(true);
      setPlaying(null);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      clearTimeout(gap.current);
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, [deps]);

  // `timeupdate` comes about four times a second: too late for a short word's end.
  useEffect(() => {
    if (playing === null || typeof requestAnimationFrame !== 'function') return;
    let frame = requestAnimationFrame(function tick() {
      reachEnd.current();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  // A new speed applies to the word now playing too.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.defaultPlaybackRate = speed;
    audio.playbackRate = speed;
  }, [speed]);

  /** Plays one word, or several one after the other with a short pause. */
  const play = useCallback((keys: string | readonly string[]) => {
    const [first, ...rest] = typeof keys === 'string' ? [keys] : keys;
    if (first === undefined) return;
    clearTimeout(gap.current);
    gap.current = undefined;
    queue.current = rest;
    start.current(first);
  }, []);

  const stop = useCallback(() => {
    clearTimeout(gap.current);
    gap.current = undefined;
    queue.current = [];
    end.current = null;
    audioRef.current?.pause();
    setPlaying(null);
  }, []);

  return {
    /** The word being played, by key. */
    playing,
    /** Whether the timings are there (false while loading or offline). */
    ready: Boolean(timings),
    /** The recitation could not be loaded (offline, or the file failed). */
    failed: failed || timings === null,
    play,
    stop,
  };
}

export type WordPlayer = ReturnType<typeof useWordPlayer>;
