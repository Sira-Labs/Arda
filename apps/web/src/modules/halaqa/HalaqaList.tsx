import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import type { HalaqaSummary } from '@/services/auth';

/** "My ḥalaqāt": open ones link to their page; pending ones wait for the teacher. */
export function HalaqaList({
  halaqat,
  teaches,
}: {
  halaqat: HalaqaSummary[];
  teaches: boolean;
}) {
  const { m } = useI18n();
  if (halaqat.length === 0) {
    return <p className="muted">{teaches ? m.halaqa.noneTeacher : m.halaqa.none}</p>;
  }
  return (
    <ul className="stack path-cards" style={{ gap: 12 }}>
      {halaqat.map((halaqa) => {
        const facts = [
          halaqa.role === 'teacher' ? null : m.halaqa.teacherOf(halaqa.teacherName),
          halaqa.oneToOne ? m.halaqa.oneToOne : null,
          halaqa.role === 'teacher' ? m.halaqa.students(halaqa.students) : null,
        ].filter(Boolean);
        const body = (
          <>
            <span className="stack" style={{ gap: 4 }}>
              <strong>{halaqa.name}</strong>
              <span className="muted">{facts.join(' · ')}</span>
            </span>
            {halaqa.status === 'pending' && (
              <span className="chip chip-quiet">{m.halaqa.waiting}</span>
            )}
            {halaqa.pending ? (
              <span className="chip">{m.halaqa.pending(halaqa.pending)}</span>
            ) : null}
          </>
        );
        return (
          <li key={halaqa.id}>
            {halaqa.status === 'active' ? (
              <Link className="card path-card" to={`/halaqa/${halaqa.id}`}>
                {body}
              </Link>
            ) : (
              <div className="card path-card">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
