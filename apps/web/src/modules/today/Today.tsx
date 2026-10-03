import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { TajweedText } from '@/components/TajweedText';
import { RULE_FAMILIES, RULE_LABELS, type Segment } from '@/tajweed/rules';
import { useSession } from '@/state/session';

/**
 * Iqlāb from the rule card (spec F2): nūn before bāʾ becomes mīm, with ghunna. IndoPak and
 * Madīna spelling write the nūn without sukūn and with a small high mīm (U+06E2).
 */
const IQLAB: readonly Segment[] = [
  { text: 'مِ' },
  { text: 'نۢ', rule: 'ghunna' },
  { text: ' ' },
  { text: 'بَ', rule: 'qalqala' },
  { text: 'عْدِ' },
];

/**
 * Today: what your sheikh asked for comes first, then the next step on the path. The data is
 * a placeholder until assignments (spec T2) and the path (spec F1) exist.
 */
export function Today() {
  const { me, offline } = useSession();

  return (
    <div className="stack" style={{ gap: 24 }}>
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <div className="stack" style={{ gap: 4 }}>
          <p className="eyebrow">Heute</p>
          <h1>{me?.name ? `Assalāmu ʿalaikum, ${me.name}` : 'Assalāmu ʿalaikum'}</h1>
        </div>
        <Link
          className="btn"
          to={me ? '/konto' : '/anmelden'}
          aria-label={me ? 'Konto' : 'Anmelden'}
        >
          <Icon name="account" />
          {me ? 'Konto' : 'Anmelden'}
        </Link>
      </header>
      {offline && (
        <p className="muted" role="status">
          Offline – du lernst weiter, dein Sheikh sieht es beim nächsten Verbinden.
        </p>
      )}

      <section className="card card-ink stack" aria-labelledby="from-sheikh">
        <p className="eyebrow" style={{ color: 'var(--accent-fill)' }}>
          Von meinem Sheikh
        </p>
        <h2 id="from-sheikh">
          {me ? 'Noch keine Aufgaben' : 'Verbinde dich mit deinem Sheikh'}
        </h2>
        <p className="muted">
          {me
            ? 'Sobald er dir eine Stelle im Muṣḥaf markiert, steht sie hier ganz oben – mit Termin.'
            : 'Melde dich an und tritt seiner Ḥalaqa per Link oder QR-Code bei.'}
        </p>
      </section>

      <section className="card stack" aria-labelledby="next-unit">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="eyebrow">Weiter auf dem Pfad · Einheit 2</p>
          <span className="chip">+20 XP</span>
        </div>
        <h2 id="next-unit">Iqlāb – Nūn wird zu Mīm vor Bāʾ</h2>
        <TajweedText segments={IQLAB} large />
        <ol className="muted" style={{ margin: 0, paddingLeft: 22 }}>
          <li>Erkenne Nūn sākina oder Tanwīn vor ب</li>
          <li>Wandle das „n“ in ein „m“ um</li>
          <li>Lippen schließen, Ghunna 2 Zählzeiten halten</li>
          <li>Lippen öffnen und das Bāʾ sprechen</li>
        </ol>
      </section>

      <section className="stack" aria-label="Farben im Muṣḥaf">
        <div className="legend">
          {RULE_FAMILIES.map((family) => (
            <span key={family}>
              <b className="tj" data-rule={family}>
                ●
              </b>{' '}
              <b>{RULE_LABELS[family].name}</b> · {RULE_LABELS[family].hint}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
