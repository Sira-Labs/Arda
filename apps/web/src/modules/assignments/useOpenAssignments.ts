import { useCallback, useEffect, useState } from 'react';
import type { ApiResult } from '@/services/api/request';
import type { StudentAssignment } from '@/services/auth';
import { useSession } from '@/state/session';

type Failure = Extract<ApiResult<unknown>, { ok: false }>;

/**
 * What the signed-in student still has to do, across their ḥalaqāt (spec T2): `null` while
 * loading or when nobody is signed in. Marking one done keeps it in the list, marked, until
 * the next load, so it can be taken back.
 */
export function useOpenAssignments() {
  const { me, client } = useSession();
  const [assignments, setAssignments] = useState<StudentAssignment[] | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me) {
      setAssignments(null);
      setFailure(null);
      return;
    }
    let current = true;
    void client.openAssignments().then((result) => {
      if (!current) return;
      if (result.ok) {
        setAssignments(result.value.assignments);
        setFailure(null);
      } else {
        setFailure(result);
      }
    });
    return () => {
      current = false;
    };
  }, [client, me]);

  const mark = useCallback(
    async (assignment: StudentAssignment, done: boolean) => {
      setBusy(true);
      try {
        const result = await client.markAssignment(
          assignment.halaqaId,
          assignment.id,
          done
        );
        if (!result.ok) {
          setFailure(result);
          return;
        }
        setFailure(null);
        const doneAt = done ? new Date().toISOString() : null;
        setAssignments((list) =>
          list ? list.map((a) => (a.id === assignment.id ? { ...a, doneAt } : a)) : list
        );
      } finally {
        setBusy(false);
      }
    },
    [client]
  );

  return { assignments, failure, busy, mark };
}
