import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { logger } from '@/services/logger';
import {
  ayaAudio,
  reciterOf,
  useReciter,
  useSpeed,
  type Reciter,
  type ReciterId,
} from './reciters';
import { fetchTimings, wordsAt, type FetchTimings, type Timings } from './timings';

const log = logger.child('player');

/** An āya to play; āya 0 is the basmala before a sūra. */
export interface PlayItem {
  sura: number;
  aya: number;
}

/** How the player makes sound and finds timings: the browser's, or a test's. */
export interface PlayerDeps {
  createAudio: () => HTMLAudioElement;
  fetchTimings: FetchTimings;
}

export const PlayerContext = createContext<PlayerDeps>({
  createAudio: () => new Audio(),
  fetchTimings,
});

/** A pause before a loop starts again, to repeat after the reciter (spec F4). */
const LOOP_PAUSE_MS = 1200;

interface Track {
  queue: readonly PlayItem[];
  index: number;
}

/** What is being recited: the āya, and which of its words (all, without timings). */
export interface Recited extends PlayItem {
  from: number;
  to: number;
}

/**
 * The reciter player (spec F4, ADR-0011): plays a list of āyāt one recording after another,
 * at the chosen speed, once or in a loop with a pause; says which words are being recited,
 * word by word where timings exist, else the whole āya.
 */
export function usePlayer() {
  const deps = useContext(PlayerContext);
  const reciter: Reciter = reciterOf(useReciter());
  const speed = Number(useSpeed());
  const [loop, setLoop] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [failed, setFailed] = useState(false);
  const [timings, setTimings] = useState<{ id: ReciterId; data: Timings | null } | null>(
    null
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // The pause before a repeat; cleared when the reader stops, pauses or plays something else,
  // so it cannot bring back a list of āyāt that was left.
  const again = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef({ track, loop });
  latest.current = { track, loop };

  // The chosen reciter's timings, fetched when the reciter is chosen.
  useEffect(() => {
    if (!reciter.timed) return;
    let live = true;
    deps
      .fetchTimings(reciter.id)
      .catch((error: unknown) => {
        log.debug('timings unavailable', { reciter: reciter.id, error: String(error) });
        return null;
      })
      .then((data) => {
        if (live) setTimings({ id: reciter.id, data });
      });
    return () => {
      live = false;
    };
  }, [deps, reciter]);

  // One audio element for the screen's life.
  useEffect(() => {
    const audio = deps.createAudio();
    audioRef.current = audio;
    const onEnded = () => {
      const { track: current, loop: looping } = latest.current;
      if (!current) return;
      if (current.index + 1 < current.queue.length) {
        setTrack({ queue: current.queue, index: current.index + 1 });
      } else if (looping) {
        again.current = setTimeout(
          () => setTrack({ queue: current.queue, index: 0 }),
          LOOP_PAUSE_MS
        );
      } else {
        setPlaying(false);
        setTrack(null);
      }
    };
    const onTime = () => setPosition(audio.currentTime * 1000);
    const onError = () => {
      log.debug('recitation failed to load', { src: audio.src });
      // Playing again starts afresh, so the recording is asked for again.
      setFailed(true);
      setPlaying(false);
      setTrack(null);
    };
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('error', onError);
    return () => {
      clearTimeout(again.current);
      audio.pause();
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, [deps]);

  // A new āya (or reciter): its recording from the start.
  const item = track?.queue[track.index];
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track || !item) return;
    audio.src = ayaAudio(reciter, item.sura, item.aya);
    setPosition(0);
  }, [track, item, reciter]);

  // Play or pause, at the chosen speed (a new source resets the rate to the default one).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.defaultPlaybackRate = speed;
    audio.playbackRate = speed;
    if (!track || !playing) {
      audio.pause();
      return;
    }
    audio.play().catch((error: unknown) => {
      // A newer source interrupting this one is not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      log.debug('recitation did not start', { error: String(error) });
      setFailed(true);
      setPlaying(false);
    });
  }, [track, playing, speed, reciter]);

  // Word by word needs the time more often than `timeupdate` gives it.
  useEffect(() => {
    if (!playing || typeof requestAnimationFrame !== 'function') return;
    let frame = requestAnimationFrame(function tick() {
      const audio = audioRef.current;
      if (audio) setPosition(audio.currentTime * 1000);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const start = useCallback((queue: readonly PlayItem[], looping: boolean) => {
    if (queue.length === 0) return;
    clearTimeout(again.current);
    setFailed(false);
    setLoop(looping);
    setTrack({ queue, index: 0 });
    setPlaying(true);
  }, []);
  /** Plays the āyāt once, one after another. */
  const play = useCallback((queue: readonly PlayItem[]) => start(queue, false), [start]);
  /** Plays the āyāt again and again, with a pause to repeat after the reciter. */
  const repeat = useCallback((queue: readonly PlayItem[]) => start(queue, true), [start]);
  const pause = useCallback(() => {
    clearTimeout(again.current);
    setPlaying(false);
  }, []);
  const resume = useCallback(() => {
    setFailed(false);
    setPlaying(true);
  }, []);
  const stop = useCallback(() => {
    clearTimeout(again.current);
    setPlaying(false);
    setTrack(null);
  }, []);

  let recited: Recited | null = null;
  if (item && playing) {
    const segments =
      reciter.timed && timings?.id === reciter.id
        ? timings.data?.ayat[item.aya === 0 ? '1:1' : `${item.sura}:${item.aya}`]
        : undefined;
    const words = segments
      ? wordsAt(segments, position)
      : { from: 1, to: Number.MAX_SAFE_INTEGER };
    recited = words ? { ...item, ...words } : null;
  }

  return {
    reciter,
    loop,
    setLoop,
    playing,
    /** Paused within a list of āyāt, ready to go on. */
    paused: !playing && track !== null,
    /** The āya being played or paused in, if any. */
    current: item ?? null,
    failed,
    recited,
    play,
    repeat,
    pause,
    resume,
    stop,
  };
}

export type Player = ReturnType<typeof usePlayer>;
