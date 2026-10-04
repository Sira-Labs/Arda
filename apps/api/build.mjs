// Builds the api for Node (ADR-0002): one ESM bundle with the api's code and the workspace
// packages (@arda/*), which are TypeScript source. npm dependencies stay external and are
// loaded from node_modules at runtime, as before. Types are checked by `tsc` first.
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const here = new URL('.', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', here), 'utf8'));

await build({
  entryPoints: [new URL('src/main.ts', here).pathname],
  outfile: new URL('dist/main.js', here).pathname,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // A package marked external keeps its subpaths external too (better-auth/plugins, …).
  external: Object.keys(pkg.dependencies),
  sourcemap: true,
  logLevel: 'warning',
});
