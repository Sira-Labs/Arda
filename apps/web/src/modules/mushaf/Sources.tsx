import { useI18n } from '@/i18n/I18nProvider';

/**
 * Credit for the text, the rules, the recitations and their timings, with links, as their
 * licences ask (ADR-0009, ADR-0011).
 */
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
          href="https://github.com/DigitalKhatt/digitalkhatt-js"
          target="_blank"
          rel="noreferrer"
        >
          {m.mushaf.textIndopak}
        </a>
        <br />
        <a
          href="https://github.com/cpfair/quran-tajweed"
          target="_blank"
          rel="noreferrer"
        >
          {m.mushaf.rules}
        </a>
        <br />
        <a href="https://everyayah.com" target="_blank" rel="noreferrer">
          {m.mushaf.player.sourceAudio}
        </a>
        <br />
        <a href="https://github.com/cpfair/quran-align" target="_blank" rel="noreferrer">
          {m.mushaf.player.sourceTimings}
        </a>
        <br />
        <a href="https://quranicaudio.com" target="_blank" rel="noreferrer">
          {m.mushaf.player.sourceQuranicAudio}
        </a>
        <br />
        <a
          href="https://github.com/QUD-Technologies/quranic-universal-audio"
          target="_blank"
          rel="noreferrer"
        >
          {m.mushaf.player.sourceQua}
        </a>
      </p>
    </footer>
  );
}
