import { useContext, useEffect, useRef, useState } from 'react';
import { logger } from '@/services/logger';
import { PlayerContext } from '../mushaf/usePlayer';

const log = logger.child('aya-player');

/** Plays whole āyāt (unit 8): one at a time, the one playing known by its source. */
export interface AyaPlayer {
  playing: string | null;
  failed: boolean;
  play: (src: string) => void;
}

/**
 * One audio element for the screen's life, from the muṣḥaf player's factory (PlayerContext), so
 * tests hand in a fake. A second press on the āya playing stops it.
 */
export function useAyaPlayer(): AyaPlayer {
  const deps = useContext(PlayerContext);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const audio = deps.createAudio();
    audioRef.current = audio;
    const onEnded = () => setPlaying(null);
    const onError = () => {
      log.debug('recitation failed to load', { src: audio.src });
      setFailed(true);
      setPlaying(null);
    };
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.pause();
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, [deps]);

  const play = (src: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing === src) {
      audio.pause();
      setPlaying(null);
      return;
    }
    audio.src = src;
    setFailed(false);
    setPlaying(src);
    audio.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      log.debug('recitation did not start', { error: String(error) });
      setFailed(true);
      setPlaying(null);
    });
  };

  return { playing, failed, play };
}
