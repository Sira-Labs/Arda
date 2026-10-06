/**
 * Content tools (ADR-0010):
 *
 *   npm run fetch -w @arda/tools   download the pinned sources into tools/.cache, checked
 *   npm run pack -w @arda/tools    build the packs from them into apps/web/public/packs
 *   npm run counts -w @arda/tools  write the words per āya to packages/quran/src/words.ts
 *   npm run pages -w @arda/tools   write the Madīna pages to packages/quran/src/pages.ts
 *   npm run timings -w @arda/tools write the reciters' word timings to apps/web/public/audio
 *   npm run lab-clips -w @arda/tools  measure where each lab word sounds (needs ffmpeg and
 *                                     the network) into tools/lab-clips.json
 *   npm run lab -w @arda/tools     write the letter lab's words to apps/web/src/modules/lab
 *
 * Sources and their checksums are pinned in tools/sources.json; a source that changed fails
 * the build instead of changing the Qurʾān text the app shows.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { parseCpfair } from './cpfair';
import type { Pack, PackIndex, PackIndexEntry, PackSource } from '@arda/quran';
import { countsModule, wordCounts } from './counts';
import { LAB_KEYS, buildLab, labModule, timedWord, type ShippedTimings } from './lab';
import { envelope, serialiseClips, wordBounds, type LabClips } from './labClips';
import { madinaPageStarts, pagesModule } from './pages';
import { buildSpec, pagesOf } from './build';
import { serialise } from './pack';
import { parseIndopak } from './indopak';
import { PACKS } from './packs';
import { parseTanzil } from './tanzil';
import {
  TIMED_RECITERS,
  buildSurahTimings,
  buildTimings,
  serialiseTimings,
  shippedSuras,
} from './timings';
import { unzipFile } from './zip';

const root = fileURLToPath(new URL('../', import.meta.url));
const cacheDir = `${root}.cache/`;
const outDir = fileURLToPath(new URL('../../apps/web/public/packs/', import.meta.url));
const timingsDir = fileURLToPath(
  new URL('../../apps/web/public/audio/timings/', import.meta.url)
);
const pagesFile = fileURLToPath(
  new URL('../../packages/quran/src/pages.ts', import.meta.url)
);
const countsFile = fileURLToPath(
  new URL('../../packages/quran/src/words.ts', import.meta.url)
);
const labFile = fileURLToPath(
  new URL('../../apps/web/src/modules/lab/words.ts', import.meta.url)
);
const clipsFile = `${root}lab-clips.json`;
/** al-Ḥuṣarī's teaching recitation, one file per āya (the timings were aligned to it). */
const MUALLIM_AUDIO = 'https://everyayah.com/data/Husary_Muallim_128kbps/';

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
  | 'tanzil-uthmani'
  | 'tanzil-metadata'
  | 'cpfair-tajweed'
  | 'digitalkhatt-indopak'
  | 'quran-align'
  | 'qua-maher',
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
      pages: pagesOf(pack),
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

/** The Madīna page table, from the pinned Tanzil metadata. */
async function writePages(): Promise<void> {
  const sources = await loadSources();
  const raw = await readFile(`${cacheDir}${sources['tanzil-metadata'].file}`, 'utf8');
  if (sha256(raw) !== sources['tanzil-metadata'].sha256) {
    throw new Error('tanzil-metadata: checksum differs from the pinned one');
  }
  const starts = madinaPageStarts(raw);
  await writeFile(pagesFile, pagesModule(starts));
  process.stdout.write(`${pagesFile}: ${starts.length} pages\n`);
}

/** Word timings of the reciters the player marks, for the sūras the app ships. */
async function writeTimings(): Promise<void> {
  const sources = await loadSources();
  await mkdir(timingsDir, { recursive: true });
  for (const reciter of TIMED_RECITERS) {
    const source = sources[reciter.from];
    const archive = await readFile(`${cacheDir}${source.file}`);
    if (sha256(archive) !== source.sha256) {
      throw new Error(`${reciter.from}: checksum differs from the pinned one`);
    }
    const credit = { licence: source.licence, attribution: source.attribution };
    const file = unzipFile(archive, reciter.file);
    const timings =
      reciter.from === 'quran-align'
        ? buildTimings(file.toString('utf8'), reciter, shippedSuras(), credit)
        : buildSurahTimings(
            gunzipSync(file).toString('utf8'),
            reciter,
            shippedSuras(),
            credit
          );
    const text = serialiseTimings(timings);
    await writeFile(`${timingsDir}${reciter.id}.json`, text);
    process.stdout.write(`${reciter.id}.json: ${text.length} bytes\n`);
  }
}

/** 16 kHz mono PCM of an mp3, decoded by ffmpeg. */
function decode(mp3: Buffer): Promise<Int16Array> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-nostdin',
      '-v',
      'error',
      '-i',
      'pipe:0',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-f',
      's16le',
      'pipe:1',
    ]);
    const chunks: Buffer[] = [];
    ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg exited with ${code}`));
      const pcm = Buffer.concat(chunks);
      resolve(new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2)));
    });
    ffmpeg.stdin.end(mp3);
  });
}

/** Where each lab word really sounds in its āya's file (labClips.ts). */
async function writeLabClips(): Promise<void> {
  const timings = JSON.parse(
    await readFile(`${timingsDir}husary-muallim.json`, 'utf8')
  ) as ShippedTimings;
  const audioDir = `${cacheDir}husary-muallim/`;
  await mkdir(audioDir, { recursive: true });
  const loudness = new Map<string, Float64Array>();
  const clips: LabClips['clips'] = {};
  for (const key of LAB_KEYS) {
    const timed = timedWord(timings, key);
    if (!timed) throw new Error(`${key}: not timed as a word of its own`);
    const [sura, aya] = key.split(':').map(Number);
    const file = `${String(sura).padStart(3, '0')}${String(aya).padStart(3, '0')}.mp3`;
    if (!loudness.has(file)) {
      let mp3: Buffer;
      try {
        mp3 = await readFile(`${audioDir}${file}`);
      } catch {
        const response = await fetch(`${MUALLIM_AUDIO}${file}`);
        if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
        mp3 = Buffer.from(await response.arrayBuffer());
        await writeFile(`${audioDir}${file}`, mp3);
      }
      loudness.set(file, envelope(await decode(mp3), 16000));
    }
    clips[key] = wordBounds(loudness.get(file)!, [timed.start, timed.end], timed.last);
  }
  await writeFile(
    clipsFile,
    serialiseClips({
      reciter: 'husary-muallim',
      audio: MUALLIM_AUDIO,
      note: 'Generated by npm run lab-clips -w @arda/tools (tools/src/labClips.ts); do not edit.',
      clips,
    })
  );
  process.stdout.write(`${clipsFile}: ${Object.keys(clips).length} words\n`);
}

/** The letter lab's words, from the packs and timings the app ships (no sources needed). */
async function writeLab(): Promise<void> {
  const index = JSON.parse(await readFile(`${outDir}index.json`, 'utf8')) as PackIndex;
  const packs = await Promise.all(
    index.packs.map(
      async (entry) =>
        JSON.parse(await readFile(`${outDir}${entry.file}`, 'utf8')) as Pack
    )
  );
  const timings = JSON.parse(
    await readFile(`${timingsDir}husary-muallim.json`, 'utf8')
  ) as ShippedTimings;
  const clips = JSON.parse(await readFile(clipsFile, 'utf8')) as LabClips;
  const lab = buildLab(
    {
      uthmani: packs.filter((p) => p.script === 'uthmani'),
      indopak: packs.filter((p) => p.script === 'indopak'),
    },
    timings,
    clips
  );
  await writeFile(labFile, labModule(lab));
  process.stdout.write(
    `${labFile}: ${lab.words.length} words, ${lab.pairs.length} pairs\n`
  );
}

const command = process.argv[2];
if (command === 'fetch') await fetchSources();
else if (command === 'pack') await buildPacks();
else if (command === 'counts') await writeCounts();
else if (command === 'pages') await writePages();
else if (command === 'timings') await writeTimings();
else if (command === 'lab-clips') await writeLabClips();
else if (command === 'lab') await writeLab();
else {
  process.stderr.write(
    'usage: cli.ts fetch | pack | counts | pages | timings | lab-clips | lab\n'
  );
  process.exitCode = 2;
}
