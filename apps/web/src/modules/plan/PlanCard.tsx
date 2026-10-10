import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { useReview } from '@/review/ReviewProvider';
import { NotePlace } from './StudyPlan';

/** How many open notes Today shows. */
const SHOWN = 3;

/**
 * "Mein Lernplan" on Today: the next things the student wants to learn or revise, from their
 * own notes, and the way to the plan.
 */
export function PlanCard() {
  const { m } = useI18n();
  const { notes } = useReview();
  const open = notes.filter((n) => !n.done && n.kind !== 'difficulty');
  return (
    <section className="card stack" aria-labelledby="plan-today">
      <p className="eyebrow">{m.plan.eyebrow}</p>
      <h2 id="plan-today">{m.plan.title}</h2>
      {open.length === 0 ? (
        <p className="muted">{m.plan.todayEmpty}</p>
      ) : (
        <ul
          className="stack"
          style={{ margin: 0, padding: 0, listStyle: 'none', gap: 8 }}
        >
          {open.slice(0, SHOWN).map((note) => (
            <li key={note.id} className="stack" style={{ gap: 2 }}>
              <span>
                <span className="chip">{m.plan.kinds[note.kind]}</span>{' '}
                <span dir="auto">{note.text}</span>
              </span>
              <NotePlace note={note} />
            </li>
          ))}
        </ul>
      )}
      {open.length > SHOWN && <p className="muted">{m.plan.more(open.length - SHOWN)}</p>}
      <Link className="btn" to="/lernplan" style={{ alignSelf: 'flex-start' }}>
        {m.plan.open}
      </Link>
    </section>
  );
}
