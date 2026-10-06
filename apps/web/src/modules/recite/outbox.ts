import { useEffect, useSyncExternalStore } from 'react';
import type { ApiResult } from '@/services/api/request';
import type { AuthClient, RecitationUpload } from '@/services/auth';
import { logger } from '@/services/logger';

const log = logger.child('outbox');

/**
 * The outbox (spec F7: recording works offline-first): a take is kept on the device until
 * the api has it. Sending again is safe; the api stores a client id once.
 */
export interface OutboxItem extends RecitationUpload {
  createdAt: string;
}

export interface OutboxStore {
  put(item: OutboxItem): Promise<void>;
  /** Everything waiting, oldest first. */
  all(): Promise<OutboxItem[]>;
  remove(clientId: string): Promise<void>;
}

const DB = 'arda';
const STORE = 'outbox';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'clientId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = work(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** The outbox in IndexedDB, which keeps blobs across reloads and offline days. */
export const indexedDbOutbox: OutboxStore = {
  put: async (item) => {
    await run('readwrite', (store) => store.put(item));
  },
  all: async () => {
    const items = await run<OutboxItem[]>('readonly', (store) => store.getAll());
    return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  remove: async (clientId) => {
    await run('readwrite', (store) => store.delete(clientId));
  },
};

/** An outbox in memory (tests, and browsers without IndexedDB). */
export function memoryOutbox(): OutboxStore {
  const items = new Map<string, OutboxItem>();
  return {
    put: async (item) => {
      items.set(item.clientId, item);
    },
    all: async () =>
      [...items.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    remove: async (clientId) => {
      items.delete(clientId);
    },
  };
}

// How many takes wait, for every screen that shows it.
const listeners = new Set<() => void>();
let waiting = 0;
const announce = (count: number) => {
  waiting = count;
  listeners.forEach((listener) => listener());
};

export interface FlushOutcome {
  sent: string[];
  /** Takes the api refused (they would never go through) with its reason; dropped. */
  refused: { clientId: string; code: string }[];
  /** Still waiting: offline, or the server failed. */
  waiting: number;
}

let flushing: Promise<FlushOutcome> | null = null;

/**
 * Sends what waits, oldest first. Stops at the first take that cannot go now (offline, a
 * server error) and keeps it and the rest; drops a take the api refuses, with its reason.
 */
export function flushOutbox(
  client: AuthClient,
  store: OutboxStore
): Promise<FlushOutcome> {
  if (flushing) return flushing;
  flushing = (async () => {
    const outcome: FlushOutcome = { sent: [], refused: [], waiting: 0 };
    const items = await store.all();
    for (const [index, item] of items.entries()) {
      const result: ApiResult<{ id: string }> = await client.sendRecitation(item);
      if (result.ok) {
        await store.remove(item.clientId);
        outcome.sent.push(item.clientId);
      } else if (result.status === 0 || result.status >= 500 || result.status === 401) {
        outcome.waiting = items.length - index;
        break;
      } else {
        log.warn('recitation refused', { status: result.status, code: result.code });
        await store.remove(item.clientId);
        outcome.refused.push({ clientId: item.clientId, code: result.code });
      }
    }
    announce(outcome.waiting);
    return outcome;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Puts a take in the outbox and tries to send it at once. */
export async function enqueue(
  client: AuthClient,
  store: OutboxStore,
  item: OutboxItem
): Promise<FlushOutcome> {
  await store.put(item);
  announce(waiting + 1);
  return flushOutbox(client, store);
}

/** How many takes wait for a connection. */
export function useOutboxWaiting(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => waiting,
    () => 0
  );
}

/** Sends what waits now and whenever the device comes back online. */
export function useOutboxFlush(client: AuthClient, store: OutboxStore, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const flush = () => {
      void flushOutbox(client, store).catch((error: unknown) =>
        log.warn('outbox unavailable', { error: String(error) })
      );
    };
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [client, store, enabled]);
}

/** Forget the count (tests). */
export function resetOutboxForTests(): void {
  waiting = 0;
  flushing = null;
}
