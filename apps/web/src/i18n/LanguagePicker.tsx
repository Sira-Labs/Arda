import { useI18n } from './I18nProvider';
import { LANGUAGES, NATIVE_NAMES, isLanguage } from './languages';

/**
 * The language switch: each language in its own name (ADR-0020). `compact` keeps the label
 * for screen readers only, for a screen's header.
 */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, m } = useI18n();
  return (
    <label className="row" style={{ gap: 8 }}>
      <span className={compact ? 'sr-only' : 'muted'}>{m.language.label}</span>
      <select
        className="input"
        value={language}
        onChange={(e) => {
          if (isLanguage(e.target.value)) setLanguage(e.target.value);
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
