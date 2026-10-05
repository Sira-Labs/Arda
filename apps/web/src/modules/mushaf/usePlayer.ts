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
  reciterOf,
  recordingOf,
  useReciter,
  useSpeed,
  type Reciter,
  type ReciterId,
  type Recording,
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

/** How far ahead of an āya's start the voice may be and still go on into it without a seek. */
const RUN_ON_MS = 1500;

/** Moves to `ms` in the recording, once the browser knows the file if it does not yet. */
function seek(audio: HTMLAudioElement, ms: number) {
  if (audio.readyState >= 1) {
    audio.currentTime = ms / 1000;
    return;
  }
  audio.addEventListener('loadedmetadata', () => (audio.currentTime = ms / 1000), {
    once: true,
  });
}

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
 * The reciter player (spec F4, ADR-0011): plays a list of āyāt one after another, each from
 * its own file or from its span in its sūra's file, at the chosen speed, once or in a loop
 * with a pause; says which words are being recited, word by word where timings exist, else
 * the whole āya.
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
  const cancelAgain = useCallback(() => {
    clearTimeout(again.current);
    again.current = undefined;
  }, []);
  const latest = useRef({ track, loop });
  latest.current = { track, loop };
  // The āya's recording now playing, and whether its end has been dealt with.
  const recording = useRef<Recording | null>(null);
  const done = useRef(false);

  // The chosen reciter's timings, fetched when the reciter is chosen.
  useEffect(() => {
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
    const onEnded = () => finish.current();
    const onTime = () => {
      setPosition(audio.currentTime * 1000);
      reachEnd.current();
    };
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
      cancelAgain();
      audio.pause();
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, [deps, cancelAgain]);

  /**
   * The āya is over: on to the next, or after a pause the first again (repeat), or done. A
   * sūra's file runs on past the āya, so it is paused while the repeat waits.
   */
  const finish = useRef(() => {});
  finish.current = () => {
    const { track: current, loop: looping } = latest.current;
    if (!current || done.current) return;
    done.current = true;
    if (current.index + 1 < current.queue.length) {
      setTrack({ queue: current.queue, index: current.index + 1 });
    } else if (looping) {
      audioRef.current?.pause();
      again.current = setTimeout(() => {
        again.current = undefined;
        setTrack({ queue: current.queue, index: 0 });
      }, LOOP_PAUSE_MS);
    } else {
      setPlaying(false);
      setTrack(null);
    }
  };
  /** In a sūra's file, the āya ends at its span's end, not the file's. */
  const reachEnd = useRef(() => {});
  reachEnd.current = () => {
    const end = recording.current?.end;
    const audio = audioRef.current;
    if (audio && end !== undefined && audio.currentTime * 1000 >= end) finish.current();
  };

  // A new āya (or reciter): its recording, from its start. By sūra this waits for the
  // timings, which say where the āya is; going on into the next āya of the same file needs
  // no seek, so the voice runs on without a break.
  const item = track?.queue[track.index];
  const known = timings?.id === reciter.id ? timings.data : undefined;
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track || !item) return;
    if (reciter.by === 'sura' && known === undefined) return;
    const next = recordingOf(reciter, item.sura, item.aya, known?.spans);
    if (!next) {
      log.debug('no recording for the āya', { reciter: reciter.id, ...item });
      setFailed(true);
      setPlaying(false);
      setTrack(null);
      return;
    }
    const here = audio.currentTime * 1000;
    const runsOn =
      recording.current?.src === next.src &&
      here <= next.start + 50 &&
      next.start - here < RUN_ON_MS;
    if (recording.current?.src !== next.src) audio.src = next.src;
    if (!runsOn) seek(audio, next.start);
    recording.current = next;
    done.current = false;
    setPosition(next.start);
  }, [track, item, reciter, known]);

  // Play or pause, at the chosen speed (a new source resets the rate to the default one).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.defaultPlaybackRate = speed;
    audio.playbackRate = speed;
    // By sūra, nothing plays before the timings have said where the āya is.
    if (!track || !playing || (reciter.by === 'sura' && known === undefined)) {
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
  }, [track, playing, speed, reciter, known]);

  // Word by word needs the time more often than `timeupdate` gives it.
  useEffect(() => {
    if (!playing || typeof requestAnimationFrame !== 'function') return;
    let frame = requestAnimationFrame(function tick() {
      const audio = audioRef.current;
      if (audio) setPosition(audio.currentTime * 1000);
      reachEnd.current();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const start = useCallback(
    (queue: readonly PlayItem[], looping: boolean) => {
      if (queue.length === 0) return;
      cancelAgain();
      setFailed(false);
      setLoop(looping);
      setTrack({ queue, index: 0 });
      setPlaying(true);
    },
    [cancelAgain]
  );
  /** Plays the āyāt once, one after another. */
  const play = useCallback((queue: readonly PlayItem[]) => start(queue, false), [start]);
  /** Plays the āyāt again and again, with a pause to repeat after the reciter. */
  const repeat = useCallback((queue: readonly PlayItem[]) => start(queue, true), [start]);
  const pause = useCallback(() => {
    cancelAgain();
    setPlaying(false);
  }, [cancelAgain]);
  const resume = useCallback(() => {
    setFailed(false);
    setPlaying(true);
  }, []);
  /**
   * Repeat on or off. Turned off in the pause before a repeat, the āya is done: it is not
   * played once more.
   */
  const toggleLoop = useCallback(() => {
    if (latest.current.loop && again.current !== undefined) {
      cancelAgain();
      setPlaying(false);
      setTrack(null);
    }
    setLoop((on) => !on);
  }, [cancelAgain]);
  const stop = useCallback(() => {
    cancelAgain();
    setPlaying(false);
    setTrack(null);
  }, [cancelAgain]);

  let recited: Recited | null = null;
  if (item && playing) {
    // By āya, the basmala's file is al-Fātiḥa 1, and so are its times; by sūra it has none.
    const key =
      item.aya !== 0 ? `${item.sura}:${item.aya}` : reciter.by === 'aya' ? '1:1' : '';
    const segments = known?.ayat[key];
    const words = segments
      ? wordsAt(segments, position)
      : { from: 1, to: Number.MAX_SAFE_INTEGER };
    recited = words ? { ...item, ...words } : null;
  }

  return {
    reciter,
    loop,
    toggleLoop,
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
