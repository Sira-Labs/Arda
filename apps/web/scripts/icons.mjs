/**
 * The PWA icons from the ʿArḍa mark (docs/spec/04-design-system.md §11), without dependencies:
 * the mark is two stroked squares and a circle, so it is drawn here directly (8 × 8 samples a
 * pixel) and written as PNG with node:zlib. The same input gives the same bytes.
 *
 *   npm run icons -w @arda/web   →   apps/web/public/icons/*.png
 *
 * Geometry in the favicon's 64 units (public/favicon.svg and components/Logo.tsx, `tile`).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const INK = [0x10, 0x20, 0x1b];
const SAFFRON = [0xe8, 0xa9, 0x3b];
const TEAL = [0x3f, 0xb5, 0xa3];

/** The star and its centre, shared by every icon. */
const MARK = [
  { kind: 'square', cx: 32, cy: 32, side: 28, width: 2.5, angle: 0, color: SAFFRON },
  { kind: 'square', cx: 32, cy: 32, side: 28, width: 2.5, angle: 45, color: SAFFRON },
  { kind: 'circle', cx: 32, cy: 32, r: 6, color: TEAL },
];

/** The favicon: a rounded ink tile, transparent corners ("any" purpose). */
const TILE = [{ kind: 'roundRect', size: 64, r: 14, color: INK }, ...MARK];
/**
 * Full bleed on ink for masks (Android) and the home screen (iOS rounds it itself). The star
 * reaches 21.6 units from the centre, inside the maskable safe circle of 25.6 (40 %).
 */
const BLEED = [{ kind: 'roundRect', size: 64, r: 0, color: INK }, ...MARK];

const ICONS = [
  { file: 'icon-192.png', size: 192, scene: TILE },
  { file: 'icon-512.png', size: 512, scene: TILE },
  { file: 'icon-maskable-512.png', size: 512, scene: BLEED },
  { file: 'apple-touch-icon.png', size: 180, scene: BLEED },
];

/** Whether the point (x, y) lies on the shape. */
function covers(shape, x, y) {
  switch (shape.kind) {
    case 'roundRect': {
      const { size, r } = shape;
      if (x < 0 || y < 0 || x > size || y > size) return false;
      const dx = Math.max(r - x, x - (size - r), 0);
      const dy = Math.max(r - y, y - (size - r), 0);
      return dx * dx + dy * dy <= r * r;
    }
    case 'square': {
      // Into the square's own frame; a stroke with mitred corners is the ring between two squares.
      const a = (-shape.angle * Math.PI) / 180;
      const px = x - shape.cx;
      const py = y - shape.cy;
      const u = px * Math.cos(a) - py * Math.sin(a);
      const v = px * Math.sin(a) + py * Math.cos(a);
      const d = Math.max(Math.abs(u), Math.abs(v));
      return Math.abs(d - shape.side / 2) <= shape.width / 2;
    }
    case 'circle':
      return (x - shape.cx) ** 2 + (y - shape.cy) ** 2 <= shape.r ** 2;
    default:
      throw new Error(`unknown shape ${shape.kind}`);
  }
}

/** RGBA pixels of a scene at `size` px, premultiplied while sampling, straight at the end. */
function render(scene, size, samples = 8) {
  const out = Buffer.alloc(size * size * 4);
  const unit = 64 / size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let alpha = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) * unit;
          const y = (py + (sy + 0.5) / samples) * unit;
          // The topmost shape at this point wins; every shape is opaque.
          let color = null;
          for (const shape of scene) if (covers(shape, x, y)) color = shape.color;
          if (!color) continue;
          r += color[0];
          g += color[1];
          b += color[2];
          alpha += 1;
        }
      }
      const i = (py * size + px) * 4;
      if (alpha > 0) {
        out[i] = Math.round(r / alpha);
        out[i + 1] = Math.round(g / alpha);
        out[i + 2] = Math.round(b / alpha);
      }
      out[i + 3] = Math.round((alpha / (samples * samples)) * 255);
    }
  }
  return out;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** An 8-bit RGBA PNG, no filter, maximum compression. */
function png(pixels, size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0;
    pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = fileURLToPath(new URL('../public/icons/', import.meta.url));
mkdirSync(dir, { recursive: true });
for (const icon of ICONS) {
  writeFileSync(dir + icon.file, png(render(icon.scene, icon.size), icon.size));
  console.warn(`public/icons/${icon.file} (${icon.size} px)`);
}
