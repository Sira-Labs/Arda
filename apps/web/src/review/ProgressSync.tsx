import { useSession } from '@/state/session';
import { useReview } from './ReviewProvider';
import { useProgressSync } from './useProgressSync';

/** Keeps the signed-in account's review deck in step across devices (ADR-0022). */
export function ProgressSync() {
  const { me, client } = useSession();
  useProgressSync(client, useReview(), me?.id ?? null);
  return null;
}
