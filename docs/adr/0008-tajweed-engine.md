# ADR-0008: Tajwīd engine: open rules, mapped per word, tested against the sheikh's sheet

- Status: accepted
- Date: 2026-10-03

## Context

The app colours rules in the muṣḥaf, finds every occurrence of a rule (for practice and for
the teacher's flags, ADR-0016) and explains each one. The sheikh gave a sheet ("Tajweed –
Regeln zum Ausdrucken") covering nūn sākina and tanwīn, ghunna, mīm sākina and qalqala.

## Decision

- Source annotations: **cpfair/quran-tajweed** (CC BY 4.0; 17 rule categories; Ḥafṣ; character
  indices into the Tanzil ʿUthmānī text of 2017). Imported once by `tools/` into per-word rule
  spans keyed by word (ADR-0007), with attribution.
- A pure TypeScript package **`packages/tajweed`** (shared by web and api, no I/O) owns:
  1. the **rule taxonomy** (ids, Arabic and German names, the colour family, ADR-0018 /
     design spec), including the sheet's grouping: iẓhār (6 letters), idghām with ghunna
     (ي ن م و) and without (ل ر), iqlāb (ب), ikhfāʾ (15 letters), the shafawī rules of mīm
     sākina, ghunna on mushaddad nūn and mīm, qalqala (ق ط ب ج د with sukūn);
  2. **letter classification** for nūn sākina/tanwīn, so "6 + 6 + 1 + 15 = 28: every letter
     belongs to exactly one rule" is an executable test;
  3. **mapping** from the ʿUthmānī word to the IndoPak word, so a rule is drawn on the letter
     the student actually reads;
  4. lookup: all occurrences of a rule in a range (a sūra, an assignment, a recording).
- **Acceptance tests from the sheet**: every example on the sheet (e.g. مِنْۢ بَعْدِ for iqlāb,
  the four exceptions صِنْوَانٌ, قِنْوَانٌ, الدُّنْيَا, بُنْيَانٌ that keep iẓhār inside one word)
  is a test case with the expected rule.
- **Where sources differ, the app says so.** The sheet notes one site teaching iqlāb without
  ghunna; the default is with ghunna, and a teacher can attach his own note to any rule.
- Rule texts are drafts until the sheikh has reviewed them (`reviewed_by`, `reviewed_at` on
  each text).

## Alternatives

Writing our own rule detection from scratch: possible later (it is needed for riwāyāt the open
data does not cover), but the open annotations are reviewed by many users already.

## Consequences

Juzʾ ʿAmma in IndoPak with rules is the first content pack (ADR-0010). Riwāyāt beyond Ḥafṣ need
our own rules or another source (ADR-0017).

## Update 2026-10-04: import built (S2.1)

- `tools/` imports cpfair's annotations (CC BY 4.0) onto the Tanzil text 1.1 (CC BY 3.0), both
  pinned by checksum. cpfair indexed Tanzil's 2017 text, which differs by a character or two
  in 20 āyāt of Juzʾ ʿAmma; the annotations there are moved by a checked shift (each rule's
  start letter must fit), and the import fails rather than guess. cpfair's classifier has no
  licence and is not run.
- `PACK_RULES` in `@arda/tajweed` maps cpfair's 18 categories to the colour families and to the
  sheet's rules.
- Cross-check: on Juzʾ ʿAmma the pack and `detect()` agree on every nūn and mīm rule; they
  differ only where expected (qalqala at a stop, which the engine leaves to unit 7, and three
  mīms with shadda at the start of an āya). The comparison is a test.
