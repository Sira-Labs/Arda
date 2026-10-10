import { Fragment, useMemo } from 'react';
import { entryFor } from '@/content/packs';
import { useI18n } from '@/i18n/I18nProvider';
import { useMushafScript } from '@/modules/mushaf/script';
import { usePack } from '@/modules/mushaf/usePack';
import { TOPICS, topicName, wordTopics } from '@/modules/rules/topics';
import type { RecitedRange, RuleTopic, WordMark } from '@/services/auth';

const keyOf = (mark: WordMark) => `${mark.aya}:${mark.word}`;

/** An āya's number as the muṣḥaf writes it, in Arabic-Indic digits within its end sign. */
const ayaEnd = (aya: number) => `۝${aya.toLocaleString('ar-EG')}`;

/**
 * The recited āyāt word by word, in the reader's muṣḥaf script (spec T3): while listening the
 * teacher taps the words that need work (`onToggle`) and may say which rule each was about
 * (`onTopic`, ADR-0026 update), the rule the word carries chosen for him when it is only one;
 * under the answer the student sees them marked, with the rule. Marked words are underlined
 * and named for screen readers, never colour alone. Shows nothing while the text loads or when
 * the app does not carry the sūra.
 */
export function RecitedWords({
  range,
  marks,
  onToggle,
  onTopic,
}: {
  range: RecitedRange;
  marks: readonly WordMark[];
  onToggle?: (mark: WordMark) => void;
  onTopic?: (mark: WordMark, topic: RuleTopic | null) => void;
}) {
  const { m, language } = useI18n();
  const script = useMushafScript();
  const result = usePack(entryFor(range.sura, script));
  const marked = useMemo(() => new Set(marks.map(keyOf)), [marks]);
  const sura = result?.ok
    ? result.pack.suras.find((s) => s.sura === range.sura)
    : undefined;
  if (!sura) return null;
  const ayat = sura.ayat.filter((a) => a.aya >= range.from && a.aya <= range.to);
  const wordAt = (mark: WordMark) =>
    sura.ayat.find((a) => a.aya === mark.aya)?.words[mark.word - 1];
  // The teacher names a rule for any mark; the student sees the marks that have one.
  const listed = onTopic ? marks : marks.filter((mark) => mark.topic);
  return (
    <>
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
                      onClick={() => {
                        // A word with one rule is most likely marked for it.
                        const suggested = wordTopics(word);
                        onToggle({
                          ...mark,
                          topic: suggested.length === 1 ? suggested[0]! : null,
                        });
                      }}
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
      {listed.length > 0 && (
        <ul className="mark-topics" aria-label={m.recite.markedWords}>
          {listed.map((mark) => {
            const word = wordAt(mark);
            const text = word?.t ?? `${mark.aya}:${mark.word}`;
            const suggested = word ? wordTopics(word) : [];
            const options = [
              ...suggested,
              ...TOPICS.filter((t) => !suggested.includes(t)),
            ];
            return (
              <li key={keyOf(mark)}>
                <bdi className="quran" lang="ar" dir="rtl">
                  {text}
                </bdi>
                {onTopic ? (
                  <select
                    className="input"
                    aria-label={m.recite.topicFor(text)}
                    value={mark.topic ?? ''}
                    onChange={(event) =>
                      onTopic(mark, (event.target.value || null) as RuleTopic | null)
                    }
                  >
                    <option value="">{m.recite.noTopic}</option>
                    {options.map((topic) => (
                      <option key={topic} value={topic}>
                        {topicName(topic, m, language)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{topicName(mark.topic!, m, language)}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/** Names the rule a marked word was about, or takes it back (`null`). */
export function setMarkTopic(
  marks: readonly WordMark[],
  mark: WordMark,
  topic: RuleTopic | null
): WordMark[] {
  return marks.map((m) => (keyOf(m) === keyOf(mark) ? { ...m, topic } : m));
}

/** Adds the word, or takes it away when it is marked already; reading order kept. */
export function toggleMark(marks: readonly WordMark[], mark: WordMark): WordMark[] {
  const key = keyOf(mark);
  return marks.some((m) => keyOf(m) === key)
    ? marks.filter((m) => keyOf(m) !== key)
    : [...marks, mark].sort((a, b) => a.aya - b.aya || a.word - b.word);
}
