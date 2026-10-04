# @arda/quran

The muṣḥaf's structure (ADR-0007): pure TypeScript, no I/O, shared by `apps/web` and
`apps/api`.

- `SURAS`, `sura(n)`: the 114 sūras with their Arabic name and number of āyāt (Ḥafṣ ʿan
  ʿĀṣim, Kūfan count: 6236 āyāt, tested).
- `isAyaRange(range)`: whether `{ sura, from, to }` exists in the muṣḥaf. Assignments point at
  such ranges until word keys arrive with the content packs (ADR-0014, sprint S2).

Source: [Tanzil Quran Metadata 1.0](https://tanzil.net/docs/quran_metadata), © 2008–2009
Tanzil.info, licensed under CC BY 3.0. Names and counts are copied verbatim.

Like `@arda/tajweed`, the package is consumed as TypeScript source: Vite and Vitest compile it
for the web app and the tests, and the api's build bundles it with esbuild.
