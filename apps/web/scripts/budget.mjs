// The size of what a first visit downloads, held to a budget (spec 01 §6: first load within
// 2.5 s on a mid-range phone on 4G). Runs at the end of every build and fails it when the
// app's entry grows past its limit; raising a limit is a decision, made here in review.
//
// Measured 2026-11-23 on Lighthouse's mobile preset (1.6 Mbit/s, 150 ms, CPU ×4), no service
// worker: 171 kB of entry script paint the first screen after 1.7 s in German and 2.0 s in
// Arabic, whose catalog is a second request. 283 kB took 2.3 s.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

/** Gzipped kilobytes allowed. */
export const LIMITS = { entryScript: 185, entryStyle: 10, catalog: 30 };

const kB = (bytes) => Math.round((bytes / 1024) * 10) / 10;
const zipped = (file) => gzipSync(readFileSync(file)).length;

/** What the built app weighs: the files its page names, and each language's catalog. */
export function measure(dist) {
  const html = readFileSync(new URL('index.html', dist), 'utf8');
  const named = (pattern) => [...html.matchAll(pattern)].map((match) => match[1]);
  const sum = (paths) =>
    paths.reduce(
      (total, path) => total + zipped(new URL(path.replace(/^\//, ''), dist)),
      0
    );
  const catalogs = readdirSync(new URL('assets/', dist)).filter((name) =>
    /^(en|fr|ar)-[\w-]+\.js$/.test(name)
  );
  return {
    // The page's own script and what it asks the browser to fetch with it; each file once.
    entryScript: sum([
      ...new Set([
        ...named(/<script[^>]+src="([^"]+\.js)"/g),
        ...named(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g),
        ...named(/<link[^>]+href="([^"]+\.js)"[^>]+rel="modulepreload"/g),
      ]),
    ]),
    entryStyle: sum(named(/<link[^>]+href="([^"]+\.css)"/g)),
    catalogs: Object.fromEntries(
      catalogs.map((name) => [name.slice(0, 2), zipped(new URL(`assets/${name}`, dist))])
    ),
  };
}

/** One line per part over its limit; empty when the build is within budget. */
export function over(sizes, limits = LIMITS) {
  const lines = [];
  const check = (what, bytes, limit) => {
    if (bytes > limit * 1024)
      lines.push(`${what}: ${kB(bytes)} kB gzip, limit ${limit} kB`);
  };
  check('entry script', sizes.entryScript, limits.entryScript);
  check('entry style', sizes.entryStyle, limits.entryStyle);
  for (const [language, bytes] of Object.entries(sizes.catalogs)) {
    check(`catalog ${language}`, bytes, limits.catalog);
  }
  // Three languages are fetched on demand; fewer means a catalog went back into the entry.
  if (Object.keys(sizes.catalogs).length !== 3) {
    lines.push(
      `catalogs on demand: ${Object.keys(sizes.catalogs).join(', ') || 'none'}, expected en, fr, ar`
    );
  }
  return lines;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sizes = measure(new URL('../dist/', import.meta.url));
  const problems = over(sizes);
  console.log(
    `first load: script ${kB(sizes.entryScript)} kB, style ${kB(sizes.entryStyle)} kB gzip; ` +
      `catalogs ${Object.entries(sizes.catalogs)
        .map(([language, bytes]) => `${language} ${kB(bytes)}`)
        .join(', ')} kB`
  );
  if (problems.length > 0) {
    console.error(
      `Over the first-load budget (scripts/budget.mjs):\n  ${problems.join('\n  ')}`
    );
    process.exit(1);
  }
}
