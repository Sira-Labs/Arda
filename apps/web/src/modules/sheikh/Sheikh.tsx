import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { CreateHalaqa } from '@/modules/halaqa/CreateHalaqa';
import { HalaqaList } from '@/modules/halaqa/HalaqaList';
import { useHalaqat } from '@/modules/halaqa/useHalaqat';
import { Soon } from '@/modules/Soon';
import { useSession } from '@/state/session';
import { FeedbackComposer } from './FeedbackComposer';

/**
 * The sheikh destination (spec T1): one's ḥalaqāt (pending ones waiting for the teacher);
 * teachers open new ones and preview what each student reads in their language (ADR-0020).
 */
export function Sheikh() {
  const { me } = useSession();
  const { m } = useI18n();
  const navigate = useNavigate();
  const { halaqat } = useHalaqat();
  const teaches = me?.role === 'teacher' || me?.role === 'admin';

  if (!me) {
    return (
      <div className="stack" style={{ gap: 24 }}>
        <Soon page="sheikh" />
        <Link
          className="btn btn-primary"
          to="/anmelden?zurueck=/sheikh"
          style={{ alignSelf: 'flex-start' }}
        >
          {m.today.signIn}
        </Link>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 24, maxWidth: 720 }}>
      <header className="stack" style={{ gap: 8 }}>
        <p className="eyebrow">{m.nav.sheikh}</p>
        <h1>{m.halaqa.mine}</h1>
      </header>
      {halaqat && <HalaqaList halaqat={halaqat} teaches={teaches} />}
      {teaches && <CreateHalaqa onCreated={(id) => navigate(`/halaqa/${id}`)} />}
      {teaches && <FeedbackComposer />}
    </div>
  );
}
