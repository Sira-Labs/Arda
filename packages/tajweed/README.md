# @arda/tajweed

The tajwīd engine (ADR-0008): pure TypeScript, no I/O, shared by `apps/web` and `apps/api`.

- `RULES`, `RULE_IDS`, `RULE_FAMILIES`: the rules of units 2–4 from the sheikh's sheet, with
  their Arabic name, the transliterated term and the colour family (spec 03 §3).
- `nunSakinaRule(letter)`, `mimSakinaRule(letter)`, `isQalqalaLetter(letter)`: the letter
  classes; every one of the 28 letters has exactly one nūn sākina rule (tested).
- `detect(text)`: the rules in a vocalised text (IndoPak or ʿUthmānī), as offsets into it.
  Inside one word the idghām letters keep iẓhār (صِنْوَانٌ, قِنْوَانٌ, الدُّنْيَا, بُنْيَانٌ).
  Not covered yet: madd, lām shamsiyya, hamzat al-waṣl, the rules at a stop.

The package is consumed as TypeScript source (`exports` points at `src/index.ts`): Vite and
Vitest compile it. The api gets a build step when it first imports it.

`test/sheet.fixtures.ts` holds every example of the sheet (spec 03 §4); change it only with the
sheet.
