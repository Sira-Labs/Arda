import { createContext, useContext } from 'react';
import { indexedDbOutbox, memoryOutbox, type OutboxStore } from './outbox';
import { browserRecorder, type RecorderFactory } from './recorder';

/** How the app records and keeps takes: the browser's, or a test's. */
export interface ReciteDeps {
  recorder: RecorderFactory;
  outbox: OutboxStore;
}

export const ReciteContext = createContext<ReciteDeps>({
  recorder: browserRecorder,
  outbox: typeof indexedDB === 'undefined' ? memoryOutbox() : indexedDbOutbox,
});

export const useRecite = () => useContext(ReciteContext);
