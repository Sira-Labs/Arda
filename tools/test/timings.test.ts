import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  TIMED_RECITERS,
  buildTimings,
  serialiseTimings,
  shippedSuras,
} from '../src/timings';
import { unzipFile } from '../src/zip';

/** A zip archive of the given files, deflated, as a release would carry them. */
function zip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text);
    const packed = deflateRawSync(data);
    const nameBytes = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, packed);
    directory.push(entry, nameBytes);
    offset += 30 + nameBytes.length + packed.length;
  }
  const dir = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

describe('reading the release archive', () => {
  it('finds a file by name and inflates it', () => {
    const archive = zip({ README: 'quran-align', 'Husary_64kbps.json': '[1,2,3]' });
    expect(unzipFile(archive, 'Husary_64kbps.json').toString()).toBe('[1,2,3]');
    expect(() => unzipFile(archive, 'Maher.json')).toThrow(/no Maher.json/);
  });
});

/** al-Ikhlāṣ as quran-align gives it: four āyāt of 4, 2, 4 and 5 words. */
const ikhlas = (
  third: number[][] = [
    [0, 2, 100, 900],
    [2, 4, 910, 2000],
  ]
) =>
  JSON.stringify([
    { surah: 111, ayah: 1, segments: [[0, 1, 0, 10]] },
    {
      surah: 112,
      ayah: 2,
      segments: [
        [1, 2, 600, 1200],
        [0, 1, 0, 590],
      ],
    },
    { surah: 112, ayah: 1, segments: [[0, 4, 0, 3000]] },
    { surah: 112, ayah: 3, segments: third },
    { surah: 112, ayah: 4, segments: [[0, 5, 0, 4000]] },
  ]);
const credit = { licence: 'CC BY 4.0', attribution: 'Collin Fair' };
const husary = TIMED_RECITERS.find((r) => r.id === 'husary')!;

describe('the word timings', () => {
  it('keeps the sūras asked for, every āya, segments in time order', () => {
    const timings = buildTimings(ikhlas(), husary, [112], credit);
    expect(timings.audio).toBe('Husary_64kbps');
    expect(Object.keys(timings.ayat)).toEqual(['112:1', '112:2', '112:3', '112:4']);
    expect(timings.ayat['112:2']).toEqual([
      [0, 1, 0, 590],
      [1, 2, 600, 1200],
    ]);
    // One āya per line in the file.
    expect(serialiseTimings(timings).split('\n')).toContain(
      '    "112:2": [[0,1,0,590],[1,2,600,1200]],'
    );
  });

  it('refuses timings that do not fit the āya’s words, or an āya without them', () => {
    expect(() => buildTimings(ikhlas([[0, 5, 0, 10]]), husary, [112], credit)).toThrow(
      /does not fit 112:3/
    );
    expect(() => buildTimings(ikhlas(), husary, [111, 112], credit)).toThrow(
      /no timings for 111:2/
    );
  });

  it('ships timings for the packs’ sūras: al-Fātiḥa, al-Baqara and Juzʾ ʿAmma', () => {
    const suras = shippedSuras();
    expect(suras.slice(0, 3)).toEqual([1, 2, 78]);
    expect(suras).toHaveLength(39);
  });
});
