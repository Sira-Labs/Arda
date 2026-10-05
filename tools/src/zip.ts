import { inflateRawSync } from 'node:zlib';

const END_OF_DIRECTORY = 0x06054b50;
const DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_HEADER = 0x04034b50;

/**
 * One file out of a zip archive (stored or deflated), read through its central directory.
 * Enough for the pinned quran-align release; no zip64, no encryption.
 */
export function unzipFile(archive: Buffer, name: string): Buffer {
  // The end-of-directory record sits in the last 64 KiB (it may carry a comment).
  let end = -1;
  for (let i = archive.length - 22; i >= Math.max(0, archive.length - 65_557); i--) {
    if (archive.readUInt32LE(i) === END_OF_DIRECTORY) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error('zip: no end-of-directory record');
  const entries = archive.readUInt16LE(end + 10);
  let at = archive.readUInt32LE(end + 16);
  for (let n = 0; n < entries; n++) {
    if (archive.readUInt32LE(at) !== DIRECTORY_ENTRY)
      throw new Error('zip: bad directory');
    const method = archive.readUInt16LE(at + 10);
    const compressed = archive.readUInt32LE(at + 20);
    const size = archive.readUInt32LE(at + 24);
    const nameLength = archive.readUInt16LE(at + 28);
    const extraLength = archive.readUInt16LE(at + 30);
    const commentLength = archive.readUInt16LE(at + 32);
    const local = archive.readUInt32LE(at + 42);
    const entryName = archive.toString('utf8', at + 46, at + 46 + nameLength);
    at += 46 + nameLength + extraLength + commentLength;
    if (entryName !== name) continue;

    if (archive.readUInt32LE(local) !== LOCAL_HEADER) throw new Error('zip: bad header');
    const start =
      local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28);
    const data = archive.subarray(start, start + compressed);
    const bytes =
      method === 0
        ? Buffer.from(data)
        : method === 8
          ? inflateRawSync(data)
          : (() => {
              throw new Error(`zip: ${name} uses compression method ${method}`);
            })();
    if (bytes.length !== size) throw new Error(`zip: ${name} has the wrong size`);
    return bytes;
  }
  throw new Error(`zip: no ${name} in the archive`);
}
