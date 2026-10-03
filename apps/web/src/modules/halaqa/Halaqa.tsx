import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import type { ApiResult } from '@/services/api/request';
import type { HalaqaMember, HalaqaView } from '@/services/auth';
import { useSession } from '@/state/session';
import { HalaqaAssignments } from '@/modules/assignments/HalaqaAssignments';
import { InviteBox } from './InviteBox';

/**
 * `/halaqa/:id` (screen 7, spec T1). The teacher invites, approves and removes; a student
 * sees whose ḥalaqa it is and can leave. What each sees is decided by the API.
 */
export function Halaqa() {
  const { id = '' } = useParams();
  const { me, loading, client } = useSession();
  const { m } = useI18n();
  const navigate = useNavigate();
  const [view, setView] = useState<HalaqaView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Only the latest load may set the page: an older answer (another id) is dropped.
  const latest = useRef(0);

  const load = useCallback(async () => {
    const version = ++latest.current;
    const result = await client.halaqa(id);
    if (version !== latest.current) return;
    if (result.ok) {
      setView(result.value);
      setError(null);
    } else {
      // Not a member and not there look the same, so nobody learns which ḥalaqāt exist.
      setView(null);
      setError(
        errorMessage(m, result.status === 403 ? { ...result, code: 'not_found' } : result)
      );
    }
  }, [client, id, m]);

  useEffect(() => {
    if (me) void load();
  }, [me, load]);

  if (!loading && !me) return <Navigate to={`/anmelden?zurueck=/halaqa/${id}`} replace />;
  if (error) {
    return (
      <div className="stack">
        <p role="alert">{error}</p>
        <Link to="/sheikh">{m.halaqa.back}</Link>
      </div>
    );
  }
  if (!view) return null;

  /** One action at a time; a failure is shown, success reloads (or `then` runs). */
  const act = async (
    change: () => Promise<ApiResult<unknown>>,
    then: () => unknown = load
  ) => {
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

  const { halaqa } = view;
  return (
    <div className="stack" style={{ gap: 20, maxWidth: 720 }}>
      <Link to="/sheikh">{m.halaqa.back}</Link>
      <header className="stack" style={{ gap: 6 }}>
        <p className="eyebrow">{halaqa.oneToOne ? m.halaqa.oneToOne : m.nav.sheikh}</p>
        <h1>{halaqa.name}</h1>
        {view.role === 'student' && (
          <p className="muted">{m.halaqa.teacherOf(halaqa.teacherName)}</p>
        )}
      </header>
      {actionError && <p role="alert">{actionError}</p>}

      {view.role === 'teacher' ? (
        <>
          <HalaqaAssignments
            halaqaId={halaqa.id}
            students={view.members.filter(
              (x) => x.role === 'student' && x.status === 'active'
            )}
          />
          <InviteBox
            halaqaId={halaqa.id}
            active={view.invite}
            onChanged={() => void load()}
          />
          <Members
            title={m.halaqa.waitingTitle}
            members={view.members.filter(
              (x) => x.role === 'student' && x.status === 'pending'
            )}
            actions={(member) => (
              <>
                <button
                  className="btn btn-teal"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void act(() => client.approveMember(halaqa.id, member.userId))
                  }
                >
                  {m.halaqa.approve}
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void act(() => client.removeMember(halaqa.id, member.userId))
                  }
                >
                  {m.halaqa.reject}
                </button>
              </>
            )}
          />
          <Members
            title={m.halaqa.membersTitle}
            empty={m.halaqa.noMembers}
            members={view.members.filter(
              (x) => x.role === 'student' && x.status === 'active'
            )}
            actions={(member) => (
              <button
                className="btn"
                type="button"
                disabled={busy}
                onClick={() =>
                  void act(() => client.removeMember(halaqa.id, member.userId))
                }
              >
                {m.halaqa.remove}
              </button>
            )}
          />
        </>
      ) : (
        <>
          <HalaqaAssignments halaqaId={halaqa.id} />
          <button
            className="btn"
            type="button"
            style={{ alignSelf: 'flex-start' }}
            disabled={busy}
            onClick={() =>
              void act(
                () => client.leaveHalaqa(halaqa.id),
                () => navigate('/sheikh')
              )
            }
          >
            {m.halaqa.leave}
          </button>
        </>
      )}
    </div>
  );
}

/** A titled list of students with the actions the teacher has on each. */
function Members({
  title,
  members,
  actions,
  empty,
}: {
  title: string;
  members: HalaqaMember[];
  actions: (member: HalaqaMember) => ReactNode;
  empty?: string;
}) {
  if (members.length === 0 && !empty) return null;
  return (
    <section className="card stack" aria-label={title}>
      <h2 className="h-small">{title}</h2>
      {members.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {members.map((member) => (
            <li key={member.userId} className="member-row">
              <span className="stack" style={{ gap: 2 }}>
                <strong>{member.name ?? member.email}</strong>
                {member.name && member.email && (
                  <span className="muted" dir="ltr">
                    {member.email}
                  </span>
                )}
              </span>
              <span className="row">{actions(member)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
