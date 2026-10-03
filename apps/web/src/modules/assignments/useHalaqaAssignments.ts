import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResult } from '@/services/api/request';
import type { AssignmentPage } from '@/services/auth';
import { useSession } from '@/state/session';

type Failure = Extract<ApiResult<unknown>, { ok: false }>;

/** Appends an older page to the shown one, when both are seen in the same role. */
function merge(shown: AssignmentPage, older: AssignmentPage): AssignmentPage {
  if (shown.role === 'teacher' && older.role === 'teacher') {
    return { ...older, assignments: [...shown.assignments, ...older.assignments] };
  }
  if (shown.role === 'student' && older.role === 'student') {
    return { ...older, assignments: [...shown.assignments, ...older.assignments] };
  }
  return older;
}

/**
 * A ḥalaqa's assignments, page by page (spec T2). Only the latest request may set the list,
 * so a slow answer never overwrites a newer one; a failure keeps what is shown.
 */
export function useHalaqaAssignments(halaqaId: string) {
  const { client } = useSession();
  const [page, setPage] = useState<AssignmentPage | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const version = ++latest.current;
    const result = await client.assignments(halaqaId);
    if (version !== latest.current) return;
    if (result.ok) {
      setPage(result.value);
      setFailure(null);
    } else {
      setFailure(result);
    }
  }, [client, halaqaId]);

  const loadOlder = useCallback(async () => {
    const last = page?.assignments.at(-1);
    if (!page?.more || !last) return;
    const version = ++latest.current;
    const result = await client.assignments(halaqaId, last.id);
    if (version !== latest.current) return;
    if (result.ok) {
      setPage(merge(page, result.value));
      setFailure(null);
    } else {
      setFailure(result);
    }
  }, [client, halaqaId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return { page, failure, load, loadOlder, setPage };
}
