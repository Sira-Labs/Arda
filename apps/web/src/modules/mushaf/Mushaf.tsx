import { Link } from 'react-router-dom';
import { sura } from '@arda/quran';
import { entryFor } from '@/content/packs';
import { useI18n } from '@/i18n/I18nProvider';
import { MushafSources } from './Sources';
import { usePack } from './usePack';

/** The first sūra of Juzʾ ʿAmma, whose pack holds the muṣḥaf for now. */
const FIRST = 78;

/**
 * `/mushaf` (screen 2, spec F3): the sūras of the muṣḥaf. Opening it downloads and checks the
 * pack once, so the muṣḥaf works offline afterwards (S2.3).
 */
export function Mushaf() {
  const { m } = useI18n();
  const entry = entryFor(FIRST);
  const result = usePack(entry);
  const numbers = entry
    ? Array.from(
        { length: entry.suras[1] - entry.suras[0] + 1 },
        (_, i) => entry.suras[0] + i
      )
    : [];
  return (
    <div className="stack" style={{ gap: 20, maxWidth: 720 }}>
      <header className="stack" style={{ gap: 6 }}>
        <p className="eyebrow">{m.mushaf.eyebrow}</p>
        <h1>{m.mushaf.title}</h1>
        <p className="muted">{m.mushaf.script}</p>
        {result === null ? (
          <p className="muted" role="status">
            {m.mushaf.loading}
          </p>
        ) : result.ok ? (
          <p
            className="chip chip-quiet"
            role="status"
            style={{ alignSelf: 'flex-start' }}
          >
            ✓ {m.mushaf.saved}
          </p>
        ) : (
          <p role="alert">{m.mushaf.failure[result.failure]}</p>
        )}
      </header>
      <ol className="sura-list">
        {numbers.map((n) => {
          const s = sura(n)!;
          return (
            <li key={n}>
              <Link to={`/mushaf/${n}`}>
                <span className="sura-number">{n}</span>
                <span className="sura-name" lang="ar" dir="rtl">
                  {s.name}
                </span>
                <span className="muted">{m.mushaf.ayat(s.ayas)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      <MushafSources />
    </div>
  );
}
