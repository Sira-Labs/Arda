import type { Pack, PackIndex, PackIndexEntry } from '@arda/quran';
import { isPackRuleId, type PackRuleId } from '@arda/tajweed';
// The index is part of the app build: the checksum a downloaded pack must match ships with
// the app itself, so a pack changed on the way or on the server is refused (threat T6).
import indexFile from '../../public/packs/index.json';

/** The packs this build of the app ships, with the checksum each must match. */
export const builtIndex = indexFile as PackIndex;

export type MushafPack = Pack<PackRuleId>;

/** Why a pack could not be used. */
export type PackFailure = 'offline' | 'checksum' | 'invalid' | 'missing';

export type PackResult =
  | {
      ok: true;
      pack: MushafPack;
      entry: PackIndexEntry;
      fromCache: boolean;
      /** Kept in Cache Storage, so it opens offline next time. */
      stored: boolean;
    }
  | { ok: false; failure: PackFailure };

/** Where packs are kept for offline use (Cache Storage in the browser). */
export interface PackCache {
  match(url: string): Promise<Response | undefined>;
  put(url: string, response: Response): Promise<void>;
  delete(url: string): Promise<unknown>;
}

export interface PackLoaderDeps {
  index: PackIndex;
  fetch: (url: string) => Promise<Response>;
  /** `null` where the browser has no Cache Storage (then packs are not kept). */
  cache: () => Promise<PackCache | null>;
  sha256: (bytes: ArrayBuffer) => Promise<string>;
}

export const PACK_CACHE = 'arda-packs-v1';

const hex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const browserDeps: PackLoaderDeps = {
  index: builtIndex,
  fetch: (url) => fetch(url),
  cache: async () => {
    if (typeof caches === 'undefined') return null;
    try {
      return await caches.open(PACK_CACHE);
    } catch {
      // Private windows and blocked storage: work online only.
      return null;
    }
  },
  sha256: async (bytes) => hex(await crypto.subtle.digest('SHA-256', bytes)),
};

/** The pack that holds a sūra in a script, if the app has one. */
export function entryFor(
  sura: number,
  index: PackIndex = builtIndex
): PackIndexEntry | undefined {
  return index.packs.find((p) => sura >= p.suras[0] && sura <= p.suras[1]);
}

/** Whether a parsed file has the pack's shape and only known rules. */
function isPack(value: unknown): value is MushafPack {
  const pack = value as MushafPack;
  if (!pack || pack.format !== 1 || !Array.isArray(pack.suras)) return false;
  return pack.suras.every(
    (s) =>
      Number.isInteger(s.sura) &&
      Array.isArray(s.ayat) &&
      s.ayat.every((a) =>
        a.words.every(
          (w) =>
            typeof w.t === 'string' &&
            (w.r ?? []).every(
              ([start, end, rule]) =>
                Number.isInteger(start) &&
                Number.isInteger(end) &&
                start < end &&
                end <= w.t.length &&
                isPackRuleId(rule)
            )
        )
      )
  );
}

/**
 * The pack `entry` names: from the offline copy when there is one, else downloaded. Either
 * way its SHA-256 must be the one in the app's index before it is used or kept.
 */
export async function loadPack(
  entry: PackIndexEntry,
  deps: PackLoaderDeps = browserDeps
): Promise<PackResult> {
  const url = `/packs/${entry.file}`;
  const cache = await deps.cache();
  let response = await cache?.match(url);
  const fromCache = Boolean(response);
  if (!response) {
    try {
      response = await deps.fetch(url);
    } catch {
      return { ok: false, failure: 'offline' };
    }
    if (!response.ok)
      return { ok: false, failure: response.status === 404 ? 'missing' : 'offline' };
  }
  let bytes: ArrayBuffer;
  try {
    bytes = await response.clone().arrayBuffer();
  } catch {
    // The connection dropped while the body was coming.
    return { ok: false, failure: 'offline' };
  }
  if ((await deps.sha256(bytes)) !== entry.sha256) {
    if (fromCache) await cache?.delete(url);
    return { ok: false, failure: 'checksum' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, failure: 'invalid' };
  }
  if (!isPack(parsed)) return { ok: false, failure: 'invalid' };
  let stored = fromCache;
  if (!fromCache && cache) {
    // Keeping it for offline use is best effort: full or blocked storage still shows the pack.
    stored = await cache.put(url, response).then(
      () => true,
      () => false
    );
  }
  return { ok: true, pack: parsed, entry, fromCache, stored };
}
