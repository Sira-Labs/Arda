# ADR-0024: Unit tests mark the path; they do not lock it

- Status: accepted
- Date: 2026-10-07
- Related: ADR-0022 (learning without an account), ADR-0023 (activity log), spec 01 §4 and F1,
  sprint story S5.1

## Context

Spec 01 says every unit ends with a test that "unlocks the next" (Suffa's structure), and F1's
acceptance reads "finishing the test unlocks unit 3". Since ADR-0022 the learning content is open
to anyone with a link: the owner's family opened unit 2 straight from a shared link, and the
sheikh assigns rules from any unit. A hard lock would turn those links into dead ends, and a
student whose sheikh asks for qalqala could not open unit 4 before passing units 2 and 3.

The owner was offered a soft and a hard variant and did not object to the soft one recommended
(2026-10-07).

## Decision

- **Every unit with rule cards (2–4) has a test** at `/pfad/:unit/test`: ten questions from what
  the unit taught, in random order. Unit 2 mixes six words with four letters to sort, unit 3
  asks ten words, unit 4 the five qalqala letters among five others (answering "qalqala" every
  time cannot pass). Eight right answers pass it (`UNIT_TEST_PASS`, `packages/engagement`).
- **A test is a round in the activity log** (ADR-0023): kind `unit-test`, ref `unit-N`, the
  score. It earns round XP, syncs with the account, and a mistake becomes a review card like in
  any game. Whether a unit is passed is computed from the log (`passedUnits`), on every device.
- **Soft, not locked.** A passed test puts "✓ Bestanden" on the unit and its test card. Until the
  unit before is passed, a unit says "Empfohlen nach dem Test von Einheit N" — and stays open.
- Unit 1 (the letter lab) has no unit test yet: its four letters have their own quizzes; a test
  follows when the lab has all 28 letters.

## Alternatives

- **A hard lock as written in spec 01:** links from the sheikh's assignments and from family
  members would end on a locked screen; rejected for the open path of ADR-0022.
- **A separate "progress" table for passed units:** the log already holds every score; a second
  record could disagree with it.

## Consequences

- Spec 01 (§4 and F1's acceptance) now says "marks as passed and recommends the next" instead
  of "unlocks".
- Changing the pass mark changes who has passed, since it is computed from the scores; the
  scores themselves are kept.
