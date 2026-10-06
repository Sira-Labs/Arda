import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import type { StudentAssignment } from '@/services/auth';
import { AssignmentDetails, DueLabel } from './AssignmentDetails';
import { entryFor } from '@/content/packs';
import { GAME_PATH, cardPath, linkFor } from './format';

/**
 * One assignment as its student sees it, with the way into the app (rule card or game) and
 * the button that tells the sheikh it is done.
 */
export function StudentAssignmentItem({
  assignment,
  showFrom,
  busy,
  onMark,
}: {
  assignment: StudentAssignment;
  /** Name the ḥalaqa and the sheikh (on Today, where several ḥalaqāt meet). */
  showFrom?: boolean;
  busy: boolean;
  onMark: (done: boolean) => void;
}) {
  const { m } = useI18n();
  const link = linkFor(assignment.kind, assignment.focusRule);
  const done = assignment.doneAt !== null;
  const range = assignment.range;
  const inMushaf = range && entryFor(range.sura) ? range : null;
  return (
    <li className="assignment-row">
      <AssignmentDetails assignment={assignment} />
      {showFrom && (
        <span className="muted">
          {m.assignments.from(assignment.fromName, assignment.halaqaName)}
        </span>
      )}
      <DueLabel dueOn={assignment.dueOn} doneAt={assignment.doneAt} />
      <span className="row" style={{ gap: 8 }}>
        {!done && link && assignment.focusRule && (
          <Link
            className="btn"
            to={link === 'card' ? cardPath(assignment.focusRule) : GAME_PATH}
          >
            {link === 'card' ? m.assignments.openCard : m.assignments.play}
          </Link>
        )}
        {!done && inMushaf && (
          <Link
            className="btn"
            to={`/mushaf/${inMushaf.sura}?von=${inMushaf.from}&bis=${inMushaf.to}${
              inMushaf.words
                ? `&wvon=${inMushaf.words.from}&wbis=${inMushaf.words.to}`
                : ''
            }&aufgabe=${assignment.id}&halaqa=${assignment.halaqaId}`}
          >
            {m.mushaf.open}
          </Link>
        )}
        {done ? (
          <button
            className="btn"
            type="button"
            disabled={busy}
            onClick={() => onMark(false)}
          >
            {m.assignments.undo}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            type="button"
            disabled={busy}
            onClick={() => onMark(true)}
          >
            {m.assignments.markDone}
          </button>
        )}
      </span>
    </li>
  );
}
