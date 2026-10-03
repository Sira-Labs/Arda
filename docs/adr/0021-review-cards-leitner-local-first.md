# ADR-0021: Review cards: Leitner boxes, kept on the device first

- Status: accepted
- Date: 2026-10-03
- Related: ADR-0010 (offline-first), spec 01 §4 ("then it comes back"), F6 (games), T5 (rule by
  rule)

## Context

Every mistake, the student's own in a game or one the teacher marks, has to come back until
the rule holds (spec 01 §4). The games must work offline (ADR-0010), so the review deck has to
live on the device before an account and sync exist for it (spec story L3, ported from Suffa).
The sheikh will later see "who struggles with which rule" (T5), so the scheduling should be
something he can read at a glance.

## Decision

- **Leitner boxes, five of them.** A mistake puts the item in box 1, due at once. A right
  answer moves it up one box; a wrong one sends it back to box 1. Intervals: box 1 the same
  day, box 2 one day, box 3 three days, box 4 seven days, box 5 sixteen days. A right answer in
  box 5 keeps it there, due again in thirty days. The scheduling is a pure function
  (`apps/web/src/review/leitner.ts`) with the clock injected.
- **A card is the question, not the answer:** `which-rule:<text>` (a word of the sheet) or
  `sort:<letter>` (a letter of Sort the 28), with the expected rule card, the box, the due time
  and the number of lapses. Ids come from the content, never from the person, so a later sync
  merges cards by id (last write wins, as in Suffa).
- **Stored behind an interface.** `ReviewStore` has a `localStorage` implementation (one
  versioned JSON document, `arda.review.v1`) and an in-memory one for tests and blocked
  storage. The React provider takes the store by injection. When L3 lands, an IndexedDB store
  with Suffa's outbox replaces it without touching the games.
- **Per device until then.** Cards stay on the device across sign-in and sign-out; they hold
  no personal data beyond what was practised. With L3 they move to the account and into the
  GDPR export.

## Alternatives

- **SM-2 or FSRS:** better intervals for large decks, but a unit has a few dozen items, and
  "box 3 of 5" is something a student and their sheikh both understand; "ease 2.36" is not.
- **IndexedDB now:** right for content packs, but asynchronous storage for a document of a few
  kilobytes adds complexity without benefit until sync exists.
- **Server first:** the games would stop working offline, which ADR-0010 rules out.

## Consequences

- A student who switches devices before L3 starts a new deck there.
- Teacher marks (T3) and recitation checks (F7) add cards through the same store and ids
  (`mark:<wordKey>:<rule>`), so the review session needs no change.
