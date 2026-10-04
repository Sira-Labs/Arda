import { createContext, useContext, useEffect, useState } from 'react';
import type { PackIndexEntry } from '@arda/quran';
import {
  browserDeps,
  loadPack,
  type PackLoaderDeps,
  type PackResult,
} from '@/content/packs';

/** How packs are fetched, kept and checked: the browser's, or a test's. */
export const PackLoaderContext = createContext<PackLoaderDeps>(browserDeps);

/** Loads once per pack, loader and page life: the checksum is checked once, not per screen. */
const loaded = new WeakMap<PackLoaderDeps, Map<string, Promise<PackResult>>>();

/** The pack, `null` while it loads; a failed load is tried again on the next mount. */
export function usePack(entry: PackIndexEntry | undefined): PackResult | null {
  const deps = useContext(PackLoaderContext);
  const key = entry ? `${entry.id}@${entry.version}` : '';
  // The result with the pack it belongs to: another pack (a script switched) starts loading.
  const [state, setState] = useState<{ key: string; result: PackResult } | null>(null);
  useEffect(() => {
    if (!entry) return;
    let current = true;
    let cache = loaded.get(deps);
    if (!cache) loaded.set(deps, (cache = new Map()));
    let promise = cache.get(key);
    if (!promise) {
      // A failure nobody foresaw still ends the loading, and the next mount tries again.
      promise = loadPack(entry, deps).catch((): PackResult => ({
        ok: false,
        failure: 'offline',
      }));
      cache.set(key, promise);
    }
    void promise.then((value) => {
      if (!value.ok) cache.delete(key);
      if (current) setState({ key, result: value });
    });
    return () => {
      current = false;
    };
  }, [entry, key, deps]);
  if (!entry) return { ok: false, failure: 'missing' };
  return state?.key === key ? state.result : null;
}
