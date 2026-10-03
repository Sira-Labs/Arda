/**
 * Who is signed in, for the whole app. The last known profile is kept in localStorage (id,
 * name, role only) so the right screens render offline; every server call revalidates, and
 * role-gated actions are always enforced by the API (ADR-0004, ADR-0005).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AuthClient, type Me } from '@/services/auth';
import { logger } from '@/services/logger';

const log = logger.child('session');
const CACHE_KEY = 'arda.me';

export interface SessionState {
  me: Me | null;
  /** True until the first answer (or the cached profile) is known. */
  loading: boolean;
  /** The profile came from the cache because the server was not reachable. */
  offline: boolean;
  refresh(): Promise<void>;
  signOut(): Promise<void>;
  client: AuthClient;
}

const SessionContext = createContext<SessionState | null>(null);

function readCache(): Me | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Me) : null;
  } catch (error) {
    // Private mode or blocked storage: the app still works, just without the offline profile.
    log.debug('profile cache unavailable', { name: (error as Error).name });
    return null;
  }
}

function writeCache(me: Me | null): void {
  try {
    if (me) localStorage.setItem(CACHE_KEY, JSON.stringify(me));
    else localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    log.debug('profile cache unavailable', { name: (error as Error).name });
  }
}

export function SessionProvider({
  children,
  client: injected,
}: {
  children: ReactNode;
  /** Injected in tests; one client for the provider's lifetime otherwise. */
  client?: AuthClient;
}) {
  const [client] = useState(() => injected ?? new AuthClient());
  const [me, setMe] = useState<Me | null>(() => readCache());
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    const result = await client.me();
    if (result.ok) {
      setMe(result.value);
      writeCache(result.value);
      setOffline(false);
    } else if (result.code === 'offline') {
      setOffline(true);
    } else {
      log.warn('could not load the profile', {
        status: result.status,
        code: result.code,
      });
    }
    setLoading(false);
  }, [client]);

  const signOut = useCallback(async () => {
    await client.signOut();
    setMe(null);
    writeCache(null);
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ me, loading, offline, refresh, signOut, client }),
    [me, loading, offline, refresh, signOut, client]
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession needs a SessionProvider');
  return value;
}
