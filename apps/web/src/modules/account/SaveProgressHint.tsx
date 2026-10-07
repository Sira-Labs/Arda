import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/i18n/I18nProvider';
import { useSession } from '@/state/session';

/**
 * For guests only (ADR-0022): practising needs no account, but progress is kept on the
 * account. One quiet card; signing in returns to the page it was opened from.
 */
export function SaveProgressHint() {
  const { me, loading } = useSession();
  const { m } = useI18n();
  const { pathname } = useLocation();
  if (me || loading) return null;
  return (
    <section className="card stack" aria-labelledby="save-progress" style={{ gap: 8 }}>
      <h2 id="save-progress">{m.today.saveProgress}</h2>
      <p className="muted" style={{ margin: 0 }}>
        {m.today.saveProgressHint}
      </p>
      <Link
        className="btn btn-primary"
        to={`/anmelden?zurueck=${encodeURIComponent(pathname)}`}
        style={{ alignSelf: 'flex-start' }}
      >
        <Icon name="account" />
        {m.today.saveProgressAction}
      </Link>
    </section>
  );
}
