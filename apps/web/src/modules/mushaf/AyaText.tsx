import { memo } from 'react';
import { wordKey, type PackAya } from '@arda/quran';
import type { PackRuleId } from '@arda/tajweed';
import { TajweedSpans } from '@/components/TajweedText';
import { useI18n } from '@/i18n/I18nProvider';
import { wordSegments, type MushafWord } from './words';

/** A word's place: āya and its number in the āya, from 1. */
export interface Place {
  aya: number;
  n: number;
}

export interface WordTap {
  key: string;
  word: MushafWord;
  label: string;
  /** Absent for the basmala, which is not part of an āya. */
  place?: Place;
}

/**
 * Words `from`–`to` of one āya, as two numbers so that the memoised āya compares them by value;
 * `[0, 0]` for none.
 */
export const NONE = [0, 0] as const;

/**
 * The āya-end marker of an IndoPak text as shown: the source's U+202E, a layout aid of
 * DigitalKhatt's own renderer, is left out so it cannot turn the rest of the line around.
 */
const shownAfter = (after: string) => after.replace(/\u202E/g, '');

/**
 * One word: a button with its rules coloured, and what follows it: a pause sign (ʿUthmānī)
 * or the āya-end marker as printed (IndoPak).
 */
export function Word({
  tap,
  className,
  pressed,
  onTap,
  indopak = false,
}: {
  tap: WordTap;
  className?: string;
  pressed: boolean;
  onTap: (tap: WordTap) => void;
  indopak?: boolean;
}) {
  return (
    <span className={className}>
      <button
        type="button"
        className="mushaf-word"
        aria-pressed={pressed}
        onClick={() => onTap(tap)}
      >
        <TajweedSpans segments={wordSegments(tap.word)} />
      </button>
      {tap.word.a &&
        (indopak ? (
          <span className="aya-end">{shownAfter(tap.word.a)}</span>
        ) : (
          <span className="pause-mark">{tap.word.a}</span>
        ))}{' '}
    </span>
  );
}

/**
 * One āya with its end sign. Memoised: tapping or picking a word, or loading more āyāt,
 * renders again only the āyāt whose marks change (al-Baqara has 6121 words).
 */
export const AyaText = memo(function AyaText({
  sura,
  aya,
  whole,
  markFrom,
  markTo,
  pickFrom,
  pickTo,
  picking,
  selectedKey,
  onTap,
  indopak = false,
}: {
  sura: number;
  aya: PackAya<PackRuleId>;
  /** The whole āya belongs to an assignment. */
  whole: boolean;
  /** Words of an assignment that starts or ends at a word. */
  markFrom: number;
  markTo: number;
  /** Words the teacher has picked. */
  pickFrom: number;
  pickTo: number;
  picking: boolean;
  /** The tapped word, when it is in this āya. */
  selectedKey: string | null;
  onTap: (tap: WordTap) => void;
  /** IndoPak text: the āya-end marker is printed in the text, after its last word. */
  indopak?: boolean;
}) {
  const { m } = useI18n();
  return (
    <span id={`aya-${aya.aya}`} className={whole ? 'aya in-range' : 'aya'}>
      {aya.words.map((word, i) => {
        const n = i + 1;
        const key = wordKey('hafs', sura, aya.aya, n);
        const isPicked = picking && n >= pickFrom && n <= pickTo;
        return (
          <Word
            key={key}
            tap={{
              key,
              word,
              label: m.mushaf.word(sura, aya.aya, n),
              place: { aya: aya.aya, n },
            }}
            className={
              isPicked ? 'picked' : n >= markFrom && n <= markTo ? 'in-range' : undefined
            }
            pressed={picking ? isPicked : selectedKey === key}
            onTap={onTap}
            indopak={indopak}
          />
        );
      })}
      {!indopak && (
        <>
          <span className="aya-end" aria-label={`${aya.aya}`}>
            {/* The muṣḥaf numbers its āyāt in Arabic-Indic digits in every language. */}
            {'۝'}
            {aya.aya.toLocaleString('ar-EG')}
          </span>{' '}
        </>
      )}
    </span>
  );
});
