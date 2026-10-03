import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { TajweedText } from '@/components/TajweedText';
import { useI18n } from '@/i18n/I18nProvider';
import { cardName } from '@/content/unit2';
import { RULE_FAMILIES } from '@/tajweed/rules';
import { segmentsOf } from '@/tajweed/segments';
import { useSession } from '@/state/session';

/**
 * Iqlāb from its rule card (spec F2): nūn before bāʾ becomes mīm, with ghunna. IndoPak and
 * Madīna spelling write the small high mīm (U+06E2) on the nūn; the engine colours it.
 */
const IQLAB = segmentsOf('مِنۢ بَعْدِ', new Set(['iqlab']));

/**
 * Today: what your sheikh asked for comes first, then the next step on the path. The data is
 * a placeholder until assignments (spec T2) and the path (spec F1) exist.
 */
export function Today() {
  const { me, offline } = useSession();
  const { m, language } = useI18n();

  return (
    <div className="stack" style={{ gap: 24 }}>
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <div className="stack" style={{ gap: 4 }}>
          <p className="eyebrow">{m.today.eyebrow}</p>
          <h1>{m.today.greeting(me?.name ?? null)}</h1>
        </div>
        <Link className="btn" to={me ? '/konto' : '/anmelden'}>
          <Icon name="account" />
          {me ? m.today.account : m.today.signIn}
        </Link>
      </header>
      {offline && (
        <p className="muted" role="status">
          {m.today.offline}
        </p>
      )}

      <section className="card card-ink stack" aria-labelledby="from-sheikh">
        <p className="eyebrow" style={{ color: 'var(--accent-fill)' }}>
          {m.today.fromSheikh}
        </p>
        <h2 id="from-sheikh">{me ? m.today.noTasks : m.today.connect}</h2>
        <p className="muted">{me ? m.today.noTasksHint : m.today.connectHint}</p>
      </section>

      <section className="card stack" aria-labelledby="next-unit">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="eyebrow">{m.today.nextUnit}</p>
          {/* Numbers with signs stay left to right inside Arabic text. */}
          <span className="chip" dir="ltr">
            +20 XP
          </span>
        </div>
        <h2 id="next-unit">
          {cardName('iqlab', language)} – {m.cards.iqlab.title}
        </h2>
        <TajweedText segments={IQLAB} large />
        <ol className="muted" style={{ margin: 0, paddingInlineStart: 22 }}>
          {m.cards.iqlab.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <Link
          className="btn btn-primary"
          to="/pfad/2/iqlab"
          style={{ alignSelf: 'flex-start' }}
        >
          {m.today.openCard}
        </Link>
      </section>

      <section className="stack" aria-label={m.today.legend}>
        <div className="legend">
          {RULE_FAMILIES.map((family) => (
            <span key={family}>
              <b className="tj" data-rule={family}>
                ●
              </b>{' '}
              <b>{m.rules[family].name}</b> · {m.rules[family].hint}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
