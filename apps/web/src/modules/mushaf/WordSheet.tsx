import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PACK_RULES } from '@arda/tajweed';
import { TajweedText } from '@/components/TajweedText';
import { useI18n } from '@/i18n/I18nProvider';
import { cardPath, hasCard } from '@/modules/assignments/format';
import { packRuleName, wordRules, wordSegments, type MushafWord } from './words';

/**
 * A tapped word (spec F3: "tap a letter → sheet with rule"): the word large, each rule it
 * carries with its colour family and the way to its rule card, and the rule it decides for
 * the word before.
 */
export function WordSheet({
  word,
  label,
  onClose,
}: {
  word: MushafWord;
  label: string;
  onClose: () => void;
}) {
  const { m, language } = useI18n();
  const close = useRef<HTMLButtonElement>(null);
  const { carries, decides } = wordRules(word);

  useEffect(() => {
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="word-sheet card stack"
      role="dialog"
      aria-labelledby="word-sheet-title"
    >
      <p className="eyebrow" id="word-sheet-title">
        {label}
      </p>
      <TajweedText segments={wordSegments(word)} script="madina" large />
      {carries.length === 0 && decides.length === 0 && (
        <p className="muted">{m.mushaf.noRule}</p>
      )}
      <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {carries.map((id) => {
          const { family, rule } = PACK_RULES[id];
          const name = packRuleName(id, language, m);
          const familyName = m.rules[family].name;
          return (
            <li key={id} className="stack" style={{ gap: 4 }}>
              <span>
                <b className="tj" data-rule={family}>
                  ●
                </b>{' '}
                <b>{name}</b>
                {name !== familyName && ` · ${familyName}`}
              </span>
              <span className="muted">{m.rules[family].hint}</span>
              {rule && hasCard(rule) && (
                <Link to={cardPath(rule)} style={{ alignSelf: 'flex-start' }}>
                  {m.today.openCard}
                </Link>
              )}
            </li>
          );
        })}
        {decides.map((id) => (
          <li key={`f-${id}`} className="muted">
            {m.mushaf.follows(packRuleName(id, language, m))}
          </li>
        ))}
      </ul>
      <button
        ref={close}
        className="btn"
        type="button"
        style={{ alignSelf: 'flex-start' }}
        onClick={onClose}
      >
        {m.mushaf.close}
      </button>
    </div>
  );
}
