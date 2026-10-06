import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { HeadDiagram } from './HeadDiagram';
import { LAB_LETTERS, LETTERS } from './letters';

/** The draft badge: every makhraj and its drawing waits for the sheikh (spec 03 §6). */
export function DraftBadge() {
  const { m } = useI18n();
  return <span className="chip chip-quiet">{m.lab.draft}</span>;
}

/**
 * `/labor`, the letter lab (spec F5, design screen 3): the head with its five areas, and the
 * letters of the first set, each opening its own page.
 */
export function Lab() {
  const { m } = useI18n();
  const t = m.lab;
  return (
    <div className="stack" style={{ gap: 24, maxWidth: 720 }}>
      <header className="stack" style={{ gap: 8 }}>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="muted">{t.intro}</p>
        <p>
          <DraftBadge />
        </p>
      </header>

      <HeadDiagram />

      <section className="stack" style={{ gap: 12 }} aria-labelledby="lab-first-set">
        <h2 id="lab-first-set">{t.firstSet}</h2>
        <p className="muted">{t.firstSetHint}</p>
        <ul className="lab-cards">
          {LAB_LETTERS.map((id) => (
            <li key={id}>
              <Link className="card lab-card" to={`/labor/${id}`}>
                <span className="quran lab-letter" lang="ar" dir="rtl">
                  {LETTERS[id].letter}
                </span>
                <strong>{t.letters[id].name}</strong>
                <span className="muted">{t.letters[id].short}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="muted">{t.more}</p>
    </div>
  );
}
