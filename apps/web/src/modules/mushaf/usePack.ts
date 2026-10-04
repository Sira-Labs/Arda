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
  const [result, setResult] = useState<PackResult | null>(null);
  useEffect(() => {
    if (!entry) return;
    let current = true;
    const key = `${entry.id}@${entry.version}`;
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
      if (current) setResult(value);
    });
    return () => {
      current = false;
    };
  }, [entry, deps]);
  return entry ? result : { ok: false, failure: 'missing' };
}
