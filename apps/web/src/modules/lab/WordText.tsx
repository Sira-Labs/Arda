import { useI18n } from '@/i18n/I18nProvider';
import { useMushafScript } from '../mushaf/script';
import type { LabWord } from './types';

/**
 * A lab word in the reader's muṣḥaf script, the letter it is about marked (neutral, not a
 * tajwīd colour) and named for screen readers.
 */
export function WordText({
  word,
  marked = true,
  className = 'quran',
}: {
  word: LabWord;
  marked?: boolean;
  className?: string;
}) {
  const { m } = useI18n();
  const script = useMushafScript();
  const text = script === 'indopak' ? word.indopak : word.uthmani;
  const [start, end] = script === 'indopak' ? word.focus.indopak : word.focus.uthmani;
  return (
    <span
      className={className}
      data-script={script === 'indopak' ? 'indopak' : 'madina'}
      lang="ar"
      dir="rtl"
    >
      {marked ? (
        <>
          {text.slice(0, start)}
          <span className="lab-focus" title={m.lab.letters[word.letter].name}>
            {text.slice(start, end)}
          </span>
          {text.slice(end)}
        </>
      ) : (
        text
      )}
    </span>
  );
}

/** "Sūra 87, Āya 1" for a word key `hafs:sura:aya:n`. */
export function whereOf(key: string): { sura: number; aya: number; n: number } {
  const [, sura, aya, n] = key.split(':').map(Number);
  return { sura: sura ?? 0, aya: aya ?? 0, n: n ?? 0 };
}
