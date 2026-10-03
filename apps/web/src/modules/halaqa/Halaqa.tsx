import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import type { HalaqaMember, HalaqaView } from '@/services/auth';
import { useSession } from '@/state/session';
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

  const load = useCallback(async () => {
    const result = await client.halaqa(id);
    if (result.ok) setView(result.value);
    else
      setError(
        errorMessage(m, result.status === 403 ? { ...result, code: 'not_found' } : result)
      );
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

  const act = async (change: Promise<{ ok: boolean }>) => {
    const result = await change;
    if (result.ok) await load();
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

      {view.role === 'teacher' ? (
        <>
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
                  onClick={() => void act(client.approveMember(halaqa.id, member.userId))}
                >
                  {m.halaqa.approve}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => void act(client.removeMember(halaqa.id, member.userId))}
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
                onClick={() => void act(client.removeMember(halaqa.id, member.userId))}
              >
                {m.halaqa.remove}
              </button>
            )}
          />
        </>
      ) : (
        <button
          className="btn"
          type="button"
          style={{ alignSelf: 'flex-start' }}
          onClick={() =>
            void client.leaveHalaqa(halaqa.id).then((result) => {
              if (result.ok) navigate('/sheikh');
            })
          }
        >
          {m.halaqa.leave}
        </button>
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
  actions: (member: HalaqaMember) => React.ReactNode;
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
