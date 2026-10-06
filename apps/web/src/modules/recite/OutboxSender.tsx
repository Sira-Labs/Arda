import { useSession } from '@/state/session';
import { useRecite } from './context';
import { useOutboxFlush } from './outbox';

/** Sends takes recorded offline once someone is signed in and the device is online. */
export function OutboxSender() {
  const { me, client } = useSession();
  const { outbox } = useRecite();
  useOutboxFlush(client, outbox, me !== null);
  return null;
}
