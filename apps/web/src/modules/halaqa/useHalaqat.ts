import { useCallback, useEffect, useState } from 'react';
import type { ApiResult } from '@/services/api/request';
import type { HalaqaSummary } from '@/services/auth';
import { useSession } from '@/state/session';

type Failure = Extract<ApiResult<unknown>, { ok: false }>;

/**
 * The signed-in person's ḥalaqāt: `null` while loading or when nobody is signed in. A failed
 * load sets `failure` and keeps the last list; `reload` tries again.
 */
export function useHalaqat(): {
  halaqat: HalaqaSummary[] | null;
  failure: Failure | null;
  reload: () => void;
} {
  const { me, client } = useSession();
  const [halaqat, setHalaqat] = useState<HalaqaSummary[] | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!me) {
      setHalaqat(null);
      setFailure(null);
      return;
    }
    let current = true;
    void client.halaqat().then((result) => {
      if (!current) return;
      if (result.ok) {
        setHalaqat(result.value.halaqat);
        setFailure(null);
      } else {
        setFailure(result);
      }
    });
    return () => {
      current = false;
    };
  }, [client, me, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { halaqat, failure, reload };
}
