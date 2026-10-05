import { useSyncExternalStore } from 'react';

/** A choice this device remembers (script, colours), shared by every screen showing it. */
export interface StoredChoice<T extends string> {
  read: () => T;
  choose: (value: T) => void;
  use: () => T;
  /** Forget the choice made in memory (tests). */
  resetForTests: () => void;
}

/**
 * A choice kept in localStorage under `key`. Storage may be blocked (private windows,
 * cleared site data): then the choice lives in memory for this visit only.
 */
export function storedChoice<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[]
): StoredChoice<T> {
  const listeners = new Set<() => void>();
  let memory: T | null = null;
  const isAllowed = (value: unknown): value is T => allowed.includes(value as T);

  const read = (): T => {
    if (memory) return memory;
    try {
      const stored = localStorage.getItem(key);
      if (isAllowed(stored)) return stored;
    } catch {
      // Blocked storage: the fallback.
    }
    return fallback;
  };
  const choose = (value: T) => {
    memory = value;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Kept in memory for this visit only.
    }
    listeners.forEach((listener) => listener());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return {
    read,
    choose,
    use: () => useSyncExternalStore(subscribe, read, () => fallback),
    resetForTests: () => {
      memory = null;
    },
  };
}
