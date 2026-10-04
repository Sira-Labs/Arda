import { useI18n } from '@/i18n/I18nProvider';

/** Credit for the text and the rules, with links, as their licences ask (ADR-0009). */
export function MushafSources() {
  const { m } = useI18n();
  return (
    <footer className="muted mushaf-sources">
      <p className="eyebrow">{m.mushaf.sources}</p>
      <p>
        <a href="https://tanzil.net" target="_blank" rel="noreferrer">
          {m.mushaf.text}
        </a>
        <br />
        <a
          href="https://github.com/cpfair/quran-tajweed"
          target="_blank"
          rel="noreferrer"
        >
          {m.mushaf.rules}
        </a>
      </p>
    </footer>
  );
}
