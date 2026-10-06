import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import { formatMoment } from '@/modules/assignments/format';
import { Soon } from '@/modules/Soon';
import type { ApiResult } from '@/services/api/request';
import type { AdminUser, Role } from '@/services/auth';
import { useSession } from '@/state/session';
import { SecondFactor } from './SecondFactor';

type Failure = Extract<ApiResult<unknown>, { ok: false }>;

const ROLES: readonly Role[] = ['student', 'teacher', 'admin'];

/**
 * `/verwaltung` (ADR-0005): an admin finds people and changes their role (a sheikh becomes a
 * teacher) or blocks them. The api checks the role and the confirmed second factor and logs
 * every change; here a missing confirmation shows the code form first.
 */
export function Admin() {
  const { me, loading, client } = useSession();
  const { m, language } = useI18n();
  const t = m.admin;
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (query: string, cursor?: string) => {
      const result = await client.adminUsers(query, cursor);
      if (!result.ok) {
        if (result.code === 'second_factor_required') setNeedsCode(true);
        else setFailure(result);
        return;
      }
      setNeedsCode(false);
      setFailure(null);
      setNext(result.value.next);
      setUsers((list) =>
        cursor ? [...(list ?? []), ...result.value.users] : result.value.users
      );
    },
    [client]
  );

  const isAdmin = me?.role === 'admin';
  useEffect(() => {
    if (isAdmin) void load('');
  }, [isAdmin, load]);

  if (!loading && !me) return <Navigate to="/anmelden?zurueck=/verwaltung" replace />;
  if (!me) return null;
  // Not an admin: the page does not exist for them.
  if (!isAdmin) return <Soon page="notFound" />;

  const find = (event: FormEvent) => {
    event.preventDefault();
    void load(search);
  };

  const change = async (user: AdminUser, update: { role?: Role; disabled?: boolean }) => {
    setBusy(user.id);
    setNotice(null);
    try {
      const result = await client.updateUser(user.id, update);
      if (!result.ok) {
        if (result.code === 'second_factor_required') setNeedsCode(true);
        else setFailure(result);
        return;
      }
      setFailure(null);
      setUsers((list) => list?.map((u) => (u.id === user.id ? result.value : u)) ?? null);
      setNotice(t.saved(result.value.name ?? result.value.email ?? ''));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 820 }}>
      <header className="stack" style={{ gap: 6 }}>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="muted">{t.intro}</p>
      </header>

      {needsCode ? (
        <SecondFactor onConfirmed={() => void load(search)} />
      ) : (
        <section className="card stack" aria-label={t.title}>
          <form
            className="row"
            style={{ gap: 8, alignItems: 'flex-end' }}
            onSubmit={find}
          >
            <label className="stack" style={{ gap: 4, flex: 1, minWidth: 200 }}>
              <span>{t.search}</span>
              <input
                className="input"
                type="search"
                maxLength={200}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <button className="btn" type="submit">
              {t.searchButton}
            </button>
          </form>
          {notice && <p role="status">{notice}</p>}
          {users?.length === 0 && <p className="muted">{t.none}</p>}
          <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {users?.map((user) => {
              const self = user.id === me.id;
              return (
                <li key={user.id} className="member-row">
                  <span className="stack" style={{ gap: 2 }}>
                    <strong>
                      {user.name ?? user.email}
                      {self && <span className="muted"> · {t.you}</span>}
                      {user.disabled && (
                        <span className="chip chip-quiet"> {t.blocked}</span>
                      )}
                    </strong>
                    {user.name && user.email && (
                      <span className="muted" dir="ltr">
                        {user.email}
                      </span>
                    )}
                    <span className="muted">
                      {formatMoment(user.createdAt, language)}
                      {!user.emailVerified && ` · ${t.unverified}`}
                    </span>
                  </span>
                  <span className="row" style={{ gap: 8 }}>
                    <label className="stack" style={{ gap: 2 }}>
                      <span className="muted">{t.role}</span>
                      <select
                        className="input"
                        value={user.role}
                        // Nobody changes their own role or locks themselves out (api rule).
                        disabled={self || busy === user.id}
                        onChange={(event) =>
                          void change(user, { role: event.target.value as Role })
                        }
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {m.account.roles[role]}
                          </option>
                        ))}
                      </select>
                    </label>
                    {!self && (
                      <button
                        className="btn"
                        type="button"
                        disabled={busy === user.id}
                        onClick={() => void change(user, { disabled: !user.disabled })}
                      >
                        {user.disabled ? t.unblock : t.block}
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {next && (
            <button
              className="btn"
              type="button"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => void load(search, next)}
            >
              {t.more}
            </button>
          )}
        </section>
      )}
      {failure && <p role="alert">{errorMessage(m, failure)}</p>}
    </div>
  );
}
