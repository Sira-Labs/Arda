import { useState } from 'react';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import {
  directionOf,
  LANGUAGES,
  NATIVE_NAMES,
  isLanguage,
  type Language,
} from '@/i18n/languages';
import { CATALOGS, type RemarkId } from '@/i18n/messages';
import type { TranslateOutcome } from '@/services/auth';
import { useSession } from '@/state/session';

const REMARKS: readonly RemarkId[] = [
  'ghunnaShort',
  'ghunnaLong',
  'nunTooClear',
  'qalqalaMissing',
  'maddShort',
  'good',
];

/** Text shown in the student's language and direction. */
function InLanguage({ language, children }: { language: Language; children: string }) {
  return (
    <p
      lang={language}
      dir={directionOf(language)}
      style={{ margin: 0, fontSize: '1.05rem' }}
    >
      {children}
    </p>
  );
}

function LanguageSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Language;
  onChange(language: Language): void;
}) {
  return (
    <label className="row" style={{ gap: 8 }}>
      <span className="muted">{label}</span>
      <select
        className="input"
        value={value}
        onChange={(e) => {
          if (isLanguage(e.target.value)) onChange(e.target.value);
        }}
      >
        {LANGUAGES.map((l) => (
          <option key={l} value={l} lang={l}>
            {NATIVE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The sheikh writes in his language; the student reads in theirs (ADR-0020). Quick remarks are
 * translated by the catalogs (exact, free, instant); free text goes through the api, which
 * keeps tajwīd terms and āyāt unchanged. The preview shows exactly what the student will read.
 */
export function FeedbackComposer() {
  const { m, language } = useI18n();
  const { client } = useSession();
  const [from, setFrom] = useState<Language>(language);
  const [to, setTo] = useState<Language>(language === 'de' ? 'ar' : 'de');
  const [remark, setRemark] = useState<RemarkId | null>(null);
  const [text, setText] = useState('');
  const [outcome, setOutcome] = useState<TranslateOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const translate = async () => {
    setBusy(true);
    setError(null);
    setOutcome(null);
    const result = await client.translate({ text, from, to });
    setBusy(false);
    if (result.ok) setOutcome(result.value);
    else setError(errorMessage(m, result));
  };

  return (
    <section className="card stack" aria-labelledby="feedback-title">
      <p className="eyebrow">{m.feedback.eyebrow}</p>
      <h2 id="feedback-title">{m.feedback.title}</h2>
      <p className="muted">{m.feedback.intro}</p>
      <div className="row" style={{ gap: 16 }}>
        <LanguageSelect label={m.feedback.from} value={from} onChange={setFrom} />
        <LanguageSelect label={m.feedback.to} value={to} onChange={setTo} />
      </div>

      <h3>{m.feedback.quick}</h3>
      <div className="row" role="group" aria-label={m.feedback.quick}>
        {REMARKS.map((id) => (
          <button
            key={id}
            type="button"
            className={remark === id ? 'btn btn-teal' : 'btn'}
            aria-pressed={remark === id}
            lang={from}
            onClick={() => setRemark(id)}
          >
            {CATALOGS[from].remarks[id]}
          </button>
        ))}
      </div>
      {remark && (
        <div className="paper stack" style={{ gap: 6 }}>
          <span className="eyebrow">{m.feedback.preview}</span>
          <InLanguage language={to}>{CATALOGS[to].remarks[remark]}</InLanguage>
        </div>
      )}

      <h3>{m.feedback.write}</h3>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void translate();
        }}
      >
        <textarea
          className="input"
          rows={3}
          maxLength={1000}
          lang={from}
          dir={directionOf(from)}
          placeholder={m.feedback.placeholder}
          aria-label={m.feedback.write}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ paddingBlock: 10, resize: 'vertical' }}
        />
        <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()}>
          {m.feedback.translate}
        </button>
      </form>
      {error && <p className="feedback-bad">{error}</p>}
      {outcome && (
        <div className="paper stack" style={{ gap: 6 }} role="status">
          <span className="eyebrow">{m.feedback.preview}</span>
          {outcome.status === 'translated' && (
            <>
              <InLanguage language={to}>{outcome.text}</InLanguage>
              <span className="muted">{m.feedback.machine}</span>
              <details>
                <summary>{m.feedback.original}</summary>
                <InLanguage language={from}>{text}</InLanguage>
              </details>
            </>
          )}
          {outcome.status === 'original' && (
            <>
              <InLanguage language={to}>{outcome.text}</InLanguage>
              <span className="muted">{m.feedback.sameLanguage}</span>
            </>
          )}
          {outcome.status === 'unavailable' && (
            <>
              <InLanguage language={from}>{text}</InLanguage>
              <span className="feedback-bad">
                {m.feedback.unavailable[outcome.reason]}
              </span>
            </>
          )}
        </div>
      )}
    </section>
  );
}
