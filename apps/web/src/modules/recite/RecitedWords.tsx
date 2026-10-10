import { Fragment, useMemo } from 'react';
import { entryFor } from '@/content/packs';
import { useI18n } from '@/i18n/I18nProvider';
import { useMushafScript } from '@/modules/mushaf/script';
import { usePack } from '@/modules/mushaf/usePack';
import type { RecitedRange, WordMark } from '@/services/auth';

const keyOf = (mark: WordMark) => `${mark.aya}:${mark.word}`;

/** An āya's number as the muṣḥaf writes it, in Arabic-Indic digits within its end sign. */
const ayaEnd = (aya: number) => `۝${aya.toLocaleString('ar-EG')}`;

/**
 * The recited āyāt word by word, in the reader's muṣḥaf script (spec T3): while listening the
 * teacher taps the words that need work (`onToggle`); under the answer the student sees them
 * marked. Marked words are underlined and named for screen readers, never colour alone. Shows
 * nothing while the text loads or when the app does not carry the sūra.
 */
export function RecitedWords({
  range,
  marks,
  onToggle,
}: {
  range: RecitedRange;
  marks: readonly WordMark[];
  onToggle?: (mark: WordMark) => void;
}) {
  const { m } = useI18n();
  const script = useMushafScript();
  const result = usePack(entryFor(range.sura, script));
  const marked = useMemo(() => new Set(marks.map(keyOf)), [marks]);
  const sura = result?.ok
    ? result.pack.suras.find((s) => s.sura === range.sura)
    : undefined;
  if (!sura) return null;
  const ayat = sura.ayat.filter((a) => a.aya >= range.from && a.aya <= range.to);
  return (
    <p
      className="recited-words quran"
      lang="ar"
      dir="rtl"
      role={onToggle ? 'group' : undefined}
      aria-label={onToggle ? m.recite.marksHint : m.recite.marksCount(marks.length)}
    >
      {ayat.map((aya) => (
        <span key={aya.aya}>
          {aya.words.map((word, i) => {
            const mark = { aya: aya.aya, word: i + 1 };
            const on = marked.has(keyOf(mark));
            // A real space between words: the padding alone lets them run together. The
            // āya's end sign stays on the line of its last word.
            return (
              <Fragment key={i}>
                {onToggle ? (
                  <button
                    type="button"
                    className="recited-word"
                    aria-pressed={on}
                    onClick={() => onToggle(mark)}
                  >
                    {word.t}
                  </button>
                ) : (
                  <span className={on ? 'recited-word recited-mark' : 'recited-word'}>
                    {word.t}
                    {on && <span className="sr-only"> ({m.recite.marked})</span>}
                  </span>
                )}
                {i < aya.words.length - 1 ? ' ' : '\u00a0'}
              </Fragment>
            );
          })}
          <span className="recited-end" aria-hidden="true">
            {ayaEnd(aya.aya)}
          </span>{' '}
        </span>
      ))}
    </p>
  );
}

/** Adds the word, or takes it away when it is marked already; reading order kept. */
export function toggleMark(marks: readonly WordMark[], mark: WordMark): WordMark[] {
  const key = keyOf(mark);
  return marks.some((m) => keyOf(m) === key)
    ? marks.filter((m) => keyOf(m) !== key)
    : [...marks, mark].sort((a, b) => a.aya - b.aya || a.word - b.word);
}
