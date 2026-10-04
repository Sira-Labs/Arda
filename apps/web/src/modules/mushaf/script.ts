import { useSyncExternalStore } from 'react';

/** The muṣḥaf scripts the app has packs for (ADR-0017). */
export type MushafScript = 'indopak' | 'uthmani';

const KEY = 'arda.mushafScript';
/** IndoPak first: it is the sheikh's muṣḥaf (ADR-0017 update 2026-10-04). */
export const DEFAULT_SCRIPT: MushafScript = 'indopak';

const listeners = new Set<() => void>();
let memory: MushafScript | null = null;

const isScript = (value: unknown): value is MushafScript =>
  value === 'indopak' || value === 'uthmani';

/** The script this device shows; kept in localStorage, which may be blocked. */
export function readScript(): MushafScript {
  if (memory) return memory;
  try {
    const stored = localStorage.getItem(KEY);
    if (isScript(stored)) return stored;
  } catch {
    // Blocked storage: the default, and the choice lives only in memory.
  }
  return DEFAULT_SCRIPT;
}

export function chooseScript(script: MushafScript): void {
  memory = script;
  try {
    localStorage.setItem(KEY, script);
  } catch {
    // Kept in memory for this visit only.
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The chosen script, re-rendering when it changes. */
export function useMushafScript(): MushafScript {
  return useSyncExternalStore(subscribe, readScript, () => DEFAULT_SCRIPT);
}

/** Forget the choice made in memory (tests). */
export function resetScriptForTests(): void {
  memory = null;
}
