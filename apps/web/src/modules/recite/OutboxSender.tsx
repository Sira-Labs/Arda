import { useSession } from '@/state/session';
import { useRecite } from './context';
import { useOutboxFlush } from './outbox';

/** Sends the signed-in account's takes recorded offline once the device is online. */
export function OutboxSender() {
  const { me, client } = useSession();
  const { outbox } = useRecite();
  useOutboxFlush(client, outbox, me?.id ?? null);
  return null;
}
