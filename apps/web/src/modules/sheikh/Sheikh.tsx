import { Soon } from '@/modules/Soon';
import { useSession } from '@/state/session';
import { FeedbackComposer } from './FeedbackComposer';

/**
 * The sheikh destination: for students, their ḥalaqa (spec T1–T4, coming); for teachers, the
 * feedback composer that previews what each student reads in their language (ADR-0020).
 */
export function Sheikh() {
  const { me } = useSession();
  const teaches = me?.role === 'teacher' || me?.role === 'admin';
  return (
    <div className="stack" style={{ gap: 24 }}>
      <Soon page="sheikh" />
      {teaches && <FeedbackComposer />}
    </div>
  );
}
