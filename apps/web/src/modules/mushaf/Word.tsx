import { TajweedSpans } from '@/components/TajweedText';
import type { Place } from './pageModel';
import { wordSegments, type MushafWord } from './words';

export interface WordTap {
  key: string;
  word: MushafWord;
  label: string;
  place?: Place;
}

/**
 * The āya-end marker of an IndoPak text as shown: the source's U+202E, a layout aid of
 * DigitalKhatt's own renderer, is left out so it cannot turn the rest of the line around.
 */
const shownAfter = (after: string) => after.replace(/\u202E/g, '');

/**
 * One word: a button with its rules coloured, and what follows it: a pause sign (ʿUthmānī),
 * the āya-end marker as printed (IndoPak), or the āya's number the app prints (ʿUthmānī).
 */
export function Word({
  tap,
  className,
  pressed,
  onTap,
  indopak = false,
  ayaEnd,
  playing = false,
}: {
  tap: WordTap;
  className?: string;
  pressed: boolean;
  onTap: (tap: WordTap) => void;
  indopak?: boolean;
  /** ʿUthmānī text: the āya ends after this word. */
  ayaEnd?: number;
  /** The reciter is reciting this word (or its āya, without word timings). */
  playing?: boolean;
}) {
  const after = tap.word.a;
  return (
    <span
      className={className}
      data-word={tap.key}
      data-playing={playing ? 'true' : undefined}
    >
      <button
        type="button"
        className="mushaf-word"
        aria-pressed={pressed}
        onClick={() => onTap(tap)}
      >
        <TajweedSpans segments={wordSegments(tap.word)} />
      </button>
      {after &&
        (indopak ? (
          <span className="aya-end">{shownAfter(after)}</span>
        ) : (
          <span className="pause-mark">{after}</span>
        ))}
      {ayaEnd !== undefined && (
        <>
          {' '}
          <span className="aya-end" aria-label={`${ayaEnd}`}>
            {/* The muṣḥaf numbers its āyāt in Arabic-Indic digits in every language. */}
            {'\u06DD'}
            {ayaEnd.toLocaleString('ar-EG')}
          </span>
        </>
      )}{' '}
    </span>
  );
}
