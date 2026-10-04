import { Link } from 'react-router-dom';
import type { PackIndexEntry } from '@arda/quran';
import { sura } from '@arda/quran';
import { builtIndex } from '@/content/packs';
import { useI18n } from '@/i18n/I18nProvider';
import { MushafSources } from './Sources';
import { usePack } from './usePack';

/**
 * `/mushaf` (screen 2, spec F3): the sūras of the muṣḥaf, one group per pack. Opening it
 * downloads and checks each pack once, so the muṣḥaf works offline afterwards (S2.3).
 */
export function Mushaf() {
  const { m } = useI18n();
  return (
    <div className="stack" style={{ gap: 20, maxWidth: 720 }}>
      <header className="stack" style={{ gap: 6 }}>
        <p className="eyebrow">{m.mushaf.eyebrow}</p>
        <h1>{m.mushaf.title}</h1>
        <p className="muted">{m.mushaf.script}</p>
      </header>
      {builtIndex.packs.map((entry) => (
        <PackGroup key={entry.id} entry={entry} />
      ))}
      <MushafSources />
    </div>
  );
}

/** The sūras of one pack, with whether it is kept for offline use. */
function PackGroup({ entry }: { entry: PackIndexEntry }) {
  const { m } = useI18n();
  const result = usePack(entry);
  const numbers = Array.from(
    { length: entry.suras[1] - entry.suras[0] + 1 },
    (_, i) => entry.suras[0] + i
  );
  const title = m.mushaf.packs[entry.id] ?? entry.title;
  return (
    <section className="stack" aria-label={title}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 className="h-small">{title}</h2>
        {result === null ? (
          <span className="muted" role="status">
            {m.mushaf.loading}
          </span>
        ) : result.ok && result.stored ? (
          <span className="chip chip-quiet" role="status">
            ✓ {m.mushaf.saved}
          </span>
        ) : result.ok ? (
          <span className="muted" role="status">
            {m.mushaf.notSaved}
          </span>
        ) : (
          <span role="alert">{m.mushaf.failure[result.failure]}</span>
        )}
      </div>
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
    </section>
  );
}
