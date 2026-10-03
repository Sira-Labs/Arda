import { useCallback, useEffect, useState } from 'react';
import type { HalaqaSummary } from '@/services/auth';
import { useSession } from '@/state/session';

/** The signed-in person's ḥalaqāt; `null` while loading or when nobody is signed in. */
export function useHalaqat(): { halaqat: HalaqaSummary[] | null; reload: () => void } {
  const { me, client } = useSession();
  const [halaqat, setHalaqat] = useState<HalaqaSummary[] | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!me) {
      setHalaqat(null);
      return;
    }
    let current = true;
    void client.halaqat().then((result) => {
      if (current && result.ok) setHalaqat(result.value.halaqat);
    });
    return () => {
      current = false;
    };
  }, [client, me, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { halaqat, reload };
}
