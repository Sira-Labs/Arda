import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import type { InvitePreview } from '@/services/auth';
import { logger } from '@/services/logger';
import { useSession } from '@/state/session';

const log = logger.child('join');
/** Kept while the person signs in (the mail's link may open a new tab); cleared after use. */
const STORAGE_KEY = 'arda.invite';
const TOKEN = /^[A-Za-z0-9_-]{32}$/;
const KEEP_MS = 24 * 60 * 60 * 1000;

function remember(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, savedAt: Date.now() }));
  } catch (error) {
    log.debug('invite storage unavailable', { name: (error as Error).name });
  }
}

function remembered(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { token, savedAt } = JSON.parse(raw) as { token?: unknown; savedAt?: unknown };
    const fresh = typeof savedAt === 'number' && Date.now() - savedAt < KEEP_MS;
    return fresh && typeof token === 'string' && TOKEN.test(token) ? token : null;
  } catch (error) {
    log.debug('invite storage unreadable', { name: (error as Error).name });
    return null;
  }
}

function forget(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to forget when storage is blocked.
  }
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'preview'; halaqa: InvitePreview }
  | { kind: 'done'; status: 'pending' | 'active' }
  | { kind: 'failed'; message: string };

/**
 * `/beitreten#<token>` (spec T1): the invite link. The token comes in the fragment, which
 * browsers never send to a server; it is moved to storage and out of the address bar, kept
 * across sign-in, previewed, and used once.
 */
export function Join() {
  const { me, loading, client } = useSession();
  const { m } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  useEffect(() => {
    const fromLink = location.hash.slice(1);
    if (TOKEN.test(fromLink)) {
      remember(fromLink);
      navigate('/beitreten', { replace: true });
      setToken(fromLink);
    } else {
      setToken(remembered());
    }
  }, [location.hash, navigate]);

  useEffect(() => {
    if (loading || !me) return;
    if (!token) return setPhase({ kind: 'missing' });
    void client.previewInvite(token).then((result) => {
      if (result.ok) setPhase({ kind: 'preview', halaqa: result.value.halaqa });
      else {
        forget();
        setPhase({ kind: 'failed', message: errorMessage(m, result) });
      }
    });
  }, [client, loading, me, token, m]);

  const join = async () => {
    if (!token) return;
    const result = await client.joinHalaqa(token);
    if (result.ok) {
      forget();
      setPhase({ kind: 'done', status: result.value.status });
    } else {
      setPhase({ kind: 'failed', message: errorMessage(m, result) });
    }
  };

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 560 }}>
      <p className="eyebrow">{m.halaqa.join.eyebrow}</p>
      {!loading && !me ? (
        token ? (
          <>
            <p>{m.halaqa.join.signIn}</p>
            <Link
              className="btn btn-primary"
              to="/anmelden?zurueck=/beitreten"
              style={{ alignSelf: 'flex-start' }}
            >
              {m.today.signIn}
            </Link>
          </>
        ) : (
          <p>{m.halaqa.join.missing}</p>
        )
      ) : phase.kind === 'missing' ? (
        <p>{m.halaqa.join.missing}</p>
      ) : phase.kind === 'preview' ? (
        <section className="card stack">
          <h1>{m.halaqa.join.title(phase.halaqa.name)}</h1>
          <p className="muted">
            {[
              m.halaqa.teacherOf(phase.halaqa.teacherName),
              phase.halaqa.oneToOne ? m.halaqa.oneToOne : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <button
            className="btn btn-primary"
            type="button"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => void join()}
          >
            {m.halaqa.join.confirm}
          </button>
        </section>
      ) : phase.kind === 'done' ? (
        <section className="card stack" role="status">
          <p>
            {phase.status === 'pending' ? m.halaqa.join.pending : m.halaqa.join.active}
          </p>
          <Link to="/sheikh">{m.halaqa.back}</Link>
        </section>
      ) : phase.kind === 'failed' ? (
        <p role="alert">{phase.message}</p>
      ) : null}
    </div>
  );
}
