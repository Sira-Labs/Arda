/**
 * Content tools (ADR-0010):
 *
 *   npm run fetch -w @arda/tools   download the pinned sources into tools/.cache, checked
 *   npm run pack -w @arda/tools    build the packs from them into apps/web/public/packs
 *   npm run counts -w @arda/tools  write the words per āya to packages/quran/src/words.ts
 *
 * Sources and their checksums are pinned in tools/sources.json; a source that changed fails
 * the build instead of changing the Qurʾān text the app shows.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseCpfair } from './cpfair';
import type { PackIndex, PackIndexEntry, PackSource } from '@arda/quran';
import { countsModule, wordCounts } from './counts';
import { buildSpec } from './build';
import { serialise } from './pack';
import { parseIndopak } from './indopak';
import { PACKS } from './packs';
import { parseTanzil } from './tanzil';

const root = fileURLToPath(new URL('../', import.meta.url));
const cacheDir = `${root}.cache/`;
const outDir = fileURLToPath(new URL('../../apps/web/public/packs/', import.meta.url));
const countsFile = fileURLToPath(
  new URL('../../packages/quran/src/words.ts', import.meta.url)
);

interface SourceEntry {
  file: string;
  url: string;
  /** SHA-256 of the file, or for Tanzil of its text lines (`textSha256`). */
  sha256: string;
  title: string;
  licence: string;
  attribution: string;
}
type Sources = Record<
  'tanzil-uthmani' | 'cpfair-tajweed' | 'digitalkhatt-indopak',
  SourceEntry
>;

const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');

async function loadSources(): Promise<Sources> {
  return JSON.parse(await readFile(`${root}sources.json`, 'utf8')) as Sources;
}

async function fetchSources(): Promise<void> {
  const sources = await loadSources();
  await mkdir(cacheDir, { recursive: true });
  for (const [id, source] of Object.entries(sources)) {
    const response = await fetch(source.url);
    if (!response.ok)
      throw new Error(`${id}: HTTP ${response.status} from ${source.url}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    // Checked before it is kept, so a changed source is named here, not found later.
    const digest =
      id === 'tanzil-uthmani'
        ? parseTanzil(bytes.toString('utf8')).textSha256
        : sha256(bytes);
    if (digest !== source.sha256) {
      throw new Error(`${id}: checksum ${digest} is not the pinned one (${source.url})`);
    }
    await writeFile(`${cacheDir}${source.file}`, bytes);
    process.stdout.write(`${id}: ${bytes.length} bytes → .cache/${source.file}\n`);
  }
}

/** The pinned sources from the cache, checked. */
async function readSources() {
  const sources = await loadSources();
  const read = (id: keyof Sources) => readFile(`${cacheDir}${sources[id].file}`, 'utf8');

  const tanzil = parseTanzil(await read('tanzil-uthmani'));
  if (tanzil.textSha256 !== sources['tanzil-uthmani'].sha256) {
    throw new Error(
      `tanzil-uthmani: text checksum ${tanzil.textSha256} is not the pinned one`
    );
  }
  const cpfairRaw = await read('cpfair-tajweed');
  if (sha256(cpfairRaw) !== sources['cpfair-tajweed'].sha256) {
    throw new Error('cpfair-tajweed: checksum differs from the pinned one');
  }

  const indopakRaw = await read('digitalkhatt-indopak');
  if (sha256(indopakRaw) !== sources['digitalkhatt-indopak'].sha256) {
    throw new Error('digitalkhatt-indopak: checksum differs from the pinned one');
  }

  const packSources: PackSource[] = Object.entries(sources).map(([id, s]) => ({
    id,
    title: s.title,
    url: s.url,
    licence: s.licence,
    attribution: s.attribution,
    sha256: s.sha256,
  }));
  return {
    tanzil,
    annotations: parseCpfair(cpfairRaw),
    indopak: parseIndopak(indopakRaw),
    sources: packSources,
    digitalkhattNotice: await readFile(`${root}licences/digitalkhatt-js-MIT.txt`, 'utf8'),
  };
}

async function buildPacks(): Promise<void> {
  const inputs = await readSources();
  await mkdir(outDir, { recursive: true });
  const entries: PackIndexEntry[] = [];
  for (const spec of PACKS) {
    const pack = buildSpec(spec, inputs);
    const { bytes, sha256: digest } = serialise(pack);
    const file = `${pack.id}.v${pack.version}.json`;
    await writeFile(`${outDir}${file}`, bytes);
    entries.push({
      id: pack.id,
      version: pack.version,
      file,
      sha256: digest,
      bytes: bytes.length,
      script: pack.script,
      riwaya: pack.riwaya,
      title: pack.title,
      suras: [pack.suras[0]!.sura, pack.suras.at(-1)!.sura],
      sources: pack.sources.map(({ id, licence, attribution }) => ({
        id,
        licence,
        attribution,
      })),
    });
    process.stdout.write(`${file}: ${bytes.length} bytes, sha256 ${digest}\n`);
  }
  const index: PackIndex = { format: 1, packs: entries };
  await writeFile(`${outDir}index.json`, `${JSON.stringify(index, null, 2)}\n`);
}

/** Words per āya of the whole muṣḥaf, split as in the packs, for the API's range check. */
async function writeCounts(): Promise<void> {
  const { tanzil } = await readSources();
  const counts = wordCounts(tanzil);
  await writeFile(countsFile, countsModule(counts));
  process.stdout.write(`${countsFile}: ${counts.flat().length} āyāt\n`);
}

const command = process.argv[2];
if (command === 'fetch') await fetchSources();
else if (command === 'pack') await buildPacks();
else if (command === 'counts') await writeCounts();
else {
  process.stderr.write('usage: cli.ts fetch | pack | counts\n');
  process.exitCode = 2;
}
