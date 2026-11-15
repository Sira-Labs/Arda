import { Fragment, useMemo } from 'react';
import { entryFor } from '@/content/packs';
import { useI18n } from '@/i18n/I18nProvider';
import { useMushafScript } from '@/modules/mushaf/script';
import { usePack } from '@/modules/mushaf/usePack';
import { TOPICS, topicName, wordTopics } from '@/modules/rules/topics';
import type { CheckHint, RecitedRange, RuleTopic, WordMark } from '@/services/auth';

const keyOf = (mark: WordMark) => `${mark.aya}:${mark.word}`;

/** An āya's number as the muṣḥaf writes it, in Arabic-Indic digits within its end sign. */
const ayaEnd = (aya: number) => `۝${aya.toLocaleString('ar-EG')}`;

/**
 * The recited āyāt word by word, in the reader's muṣḥaf script (spec T3): while listening the
 * teacher taps the words that need work (`onToggle`) and may say which rule each was about
 * (`onTopic`, ADR-0026 update), the rule the word carries chosen for him when it is only one;
 * under the answer the student sees them marked, with the rule. Marked words are underlined
 * and named for screen readers, never colour alone. Shows no text while it loads or when the
 * app does not carry the sūra.
 *
 * `hints` are the speech check's words to listen to again (ADR-0013), for the teacher only:
 * ringed in the text, never marked for him, and listed with their rules under it as what they
 * are, hints of an automatic check. Tapping a hinted word marks it like any other.
 */
export function RecitedWords({
  range,
  marks,
  onToggle,
  onTopic,
  hints = [],
}: {
  range: RecitedRange;
  marks: readonly WordMark[];
  onToggle?: (mark: WordMark) => void;
  onTopic?: (mark: WordMark, topic: RuleTopic | null) => void;
  hints?: readonly CheckHint[];
}) {
  const { m, language } = useI18n();
  const script = useMushafScript();
  const result = usePack(entryFor(range.sura, script));
  const marked = useMemo(() => new Set(marks.map(keyOf)), [marks]);
  // A word's hints together: one word may be hinted for more than one rule.
  const hinted = useMemo(() => {
    const byWord = new Map<string, { aya: number; word: number; topics: RuleTopic[] }>();
    for (const hint of hints) {
      const entry = byWord.get(keyOf(hint)) ?? {
        aya: hint.aya,
        word: hint.word,
        topics: [],
      };
      entry.topics.push(hint.topic);
      byWord.set(keyOf(hint), entry);
    }
    return byWord;
  }, [hints]);
  const sura = result?.ok
    ? result.pack.suras.find((s) => s.sura === range.sura)
    : undefined;
  const wordAt = (mark: WordMark) =>
    sura?.ayat.find((a) => a.aya === mark.aya)?.words[mark.word - 1];
  // The hints do not wait for the text: without the pack a word is named by its place.
  const hintList = hinted.size > 0 && (
    <div className="check-hints stack" style={{ gap: 4 }}>
      <p className="muted" style={{ margin: 0 }}>
        <strong>{m.recite.hintsTitle}</strong> {m.recite.hintsNote}
      </p>
      <ul className="mark-topics" aria-label={m.recite.hintsTitle}>
        {[...hinted.values()].map((hint) => {
          const text = wordAt(hint)?.t;
          return (
            <li key={keyOf(hint)}>
              {text ? (
                <bdi className="quran" lang="ar" dir="rtl">
                  {text}
                </bdi>
              ) : (
                <span dir="ltr">{keyOf(hint)}</span>
              )}
              <span>{hint.topics.map((t) => topicName(t, m, language)).join(' · ')}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
  if (!sura) return hintList || null;
  const ayat = sura.ayat.filter((a) => a.aya >= range.from && a.aya <= range.to);
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
              const hint = hinted.has(keyOf(mark));
              // A real space between words: the padding alone lets them run together. The
              // āya's end sign stays on the line of its last word.
              return (
                <Fragment key={i}>
                  {onToggle ? (
                    <button
                      type="button"
                      className={hint ? 'recited-word recited-hint' : 'recited-word'}
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
                      {hint && <span className="sr-only"> ({m.recite.hinted})</span>}
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
      {hintList}
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
