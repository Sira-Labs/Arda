import { useState } from 'react';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import type { ApiResult } from '@/services/api/request';
import type { HalaqaMember, StudentAssignment, TeacherAssignment } from '@/services/auth';
import { useSession } from '@/state/session';
import { AssignmentDetails, DueLabel } from './AssignmentDetails';
import { AssignmentForm } from './AssignmentForm';
import { StudentAssignmentItem } from './StudentAssignmentItem';
import { useHalaqaAssignments } from './useHalaqaAssignments';

const listStyle = { margin: 0, padding: 0, listStyle: 'none' } as const;

/**
 * The assignments section of a ḥalaqa page (spec T2). Its teacher gives work and sees who is
 * done; a student sees what is meant for them and marks it done. The API decides which.
 */
export function HalaqaAssignments({
  halaqaId,
  students = [],
}: {
  halaqaId: string;
  /** The ḥalaqa's active students, for the teacher's form. */
  students?: HalaqaMember[];
}) {
  const { client } = useSession();
  const { m } = useI18n();
  const { page, failure, load, loadOlder, setPage } = useHalaqaAssignments(halaqaId);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /** One change at a time; a failure is shown, success runs `then`. */
  const act = async (change: () => Promise<ApiResult<unknown>>, then: () => unknown) => {
    setBusy(true);
    setActionError(null);
    try {
      const result = await change();
      if (result.ok) await then();
      else setActionError(errorMessage(m, result));
    } finally {
      setBusy(false);
    }
  };

  const mark = (assignment: StudentAssignment, done: boolean) =>
    void act(
      () => client.markAssignment(halaqaId, assignment.id, done),
      () =>
        setPage((shown) =>
          shown?.role === 'student'
            ? {
                ...shown,
                assignments: shown.assignments.map((a) =>
                  a.id === assignment.id
                    ? { ...a, doneAt: done ? new Date().toISOString() : null }
                    : a
                ),
              }
            : shown
        )
    );

  return (
    <section className="card stack" aria-labelledby="assignments-title">
      <h2 id="assignments-title" className="h-small">
        {m.assignments.title}
      </h2>
      {page?.role === 'teacher' && (
        <AssignmentForm
          halaqaId={halaqaId}
          students={students}
          onGiven={() => void load()}
        />
      )}
      {failure && (
        <p role="alert">
          {errorMessage(m, failure)}{' '}
          <button className="btn" type="button" onClick={() => void load()}>
            {m.halaqa.retry}
          </button>
        </p>
      )}
      {actionError && <p role="alert">{actionError}</p>}
      {page && page.assignments.length === 0 && (
        <p className="muted">{m.assignments.none}</p>
      )}
      {page?.role === 'teacher' && (
        <ul style={listStyle}>
          {page.assignments.map((assignment) => (
            <TeacherItem
              key={assignment.id}
              assignment={assignment}
              busy={busy}
              onRemove={() =>
                void act(() => client.removeAssignment(halaqaId, assignment.id), load)
              }
            />
          ))}
        </ul>
      )}
      {page?.role === 'student' && (
        <ul style={listStyle}>
          {page.assignments.map((assignment) => (
            <StudentAssignmentItem
              key={assignment.id}
              assignment={assignment}
              busy={busy}
              onMark={(done) => mark(assignment, done)}
            />
          ))}
        </ul>
      )}
      {page?.more && (
        <button
          className="btn"
          type="button"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => void loadOlder()}
        >
          {m.assignments.older}
        </button>
      )}
    </section>
  );
}

/** One assignment as its teacher sees it: for whom, who is done, and taking it back. */
function TeacherItem({
  assignment,
  busy,
  onRemove,
}: {
  assignment: TeacherAssignment;
  busy: boolean;
  onRemove: () => void;
}) {
  const { m } = useI18n();
  const who = assignment.studentId
    ? m.assignments.forStudent(assignment.studentName ?? '…')
    : m.assignments.forAll;
  const names = assignment.done.map((d) => d.name ?? d.email ?? '…');
  return (
    <li className="assignment-row">
      <AssignmentDetails assignment={assignment} />
      <span className="muted">
        {who} · <DueLabel dueOn={assignment.dueOn} />
      </span>
      <span>
        <b>{m.assignments.doneCount(assignment.done.length, assignment.targets)}</b>
        {names.length > 0 && ` · ${m.assignments.doneBy} ${names.join(', ')}`}
      </span>
      <button
        className="btn"
        type="button"
        style={{ justifySelf: 'start' }}
        disabled={busy}
        onClick={onRemove}
      >
        {m.assignments.remove}
      </button>
    </li>
  );
}
