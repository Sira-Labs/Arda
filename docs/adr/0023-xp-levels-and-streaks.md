# ADR-0023: XP, levels and streaks from an activity log

- Status: accepted
- Date: 2026-10-07
- Related: ADR-0002 (sibling of Suffa), ADR-0021 (review deck), ADR-0022 (progress on the
  account), Suffa ADR-0016 (engagement), spec 01 F1, sprint story S5.2

## Context

Spec F1 asks for XP and a streak with shields "from Suffa's engagement rules", and Today
already shows "+20 XP" on the next rule card without anything behind it. Suffa derives XP
from records it already syncs (review logs, exams, listening) with one pure rulebook used by
the app (instantly, offline) and the server (authoritatively). ʿArḍa syncs the review deck
(ADR-0022), but the deck holds each card's latest state, not what was done when: it cannot say
on which days someone practised or how many rounds they finished.

## Decision

- **An activity log.** Every finished round (Which rule?, Sort the 28, the review session, a
  letter-lab quiz) and every rule card read to its end adds one event to the progress:
  `{ id, kind, ref, at, right, total }` (the client's uuid, the game or `rule-card`, the
  letter or card, epoch milliseconds, the score). Events are only ever added.
- **One rulebook, `packages/engagement`** (pure TypeScript, Suffa's pattern): XP per event,
  the level curve and the streak are pure functions of the log and today's date in the
  device's time zone. The app computes them offline, at once; the API uses the same package
  to check events it receives, and teacher views (T5) or server totals can use it later.
- **XP rules v1** (reward effort and correctness, not volume, as in Suffa):
  - a round: 2 XP per right answer, 5 XP for finishing it, 5 more for a round without
    mistakes; round XP is capped at 200 a day;
  - a rule card read to its end: 20 XP, once per card (reading it again counts for the
    streak, not for XP).
- **Levels** follow Suffa's curve: level n + 1 needs 50·n^1.5 XP in total.
- **Streak with shields** (Suffa's rule): a day counts when something was practised on it
  (in the device's time zone); every 7 active days earn a shield (at most 2), and a shield
  covers a missed day by itself. Today does not break the streak before it is over.
- **Sync** rides on `POST /api/v1/progress/sync` (ADR-0022): the device sends the events the
  server has not confirmed and the highest server sequence number it has seen; the server
  stores new events (`activity_events`, an id per person is stored once) and answers with
  every event after that number, so each device ends up with the whole log. Events beyond
  1,000 come in pages. A guest's events join the account at the first sign-in; another
  account's events on the device are replaced, as the deck is.
- **Checks at intake:** a known kind, `0 ≤ right ≤ total ≤ 100`, a time not in the future
  (clamped like the cards), at most 500 events per request and 100,000 per person. XP is
  computed by the device; there are no leaderboards, so the server does not recompute it yet.
- **Guardrails from Suffa:** nothing to buy, no chance-based rewards, no shaming copy, rest
  days allowed through the shields.
- **Not yet:** daily quests and badges (Suffa has both); they can be added to the rulebook
  later without changing the log.

## Alternatives

- **Counting XP in the deck:** a number on the account would be the last write, not a sum;
  two devices practising offline would lose one side's XP.
- **Server-only XP:** no XP offline, which ADR-0010 rules out for the learning screens.
- **One event per answer:** finer, but ten times the records for the same XP and streak.

## Consequences

- The log grows by a few events a day (about 100 bytes each); 100,000 events are decades of
  daily practice.
- Changing a weight changes everyone's XP at once, since XP is always recomputed from the
  log; the rules carry a version for when the server keeps totals.
- The export lists the log; deleting the account deletes it.

## Update 2026-11-14: daily quests and badges

The "not yet" above is built (sprint story S5.2, spec 01 F1). Both are pure functions of the
activity log in `packages/engagement`; the log, the sync and the API do not change.

- **Daily quests** (`quests.ts`): three goals a day, the same for everyone and every day, in
  the device's time zone: finish a round; 20 right answers in rounds; practise in two different
  ways (two kinds of event, a rule card counts as one). Fixed rather than drawn, because the
  guardrails rule out chance, and three steady goals need no explaining. A quest left open is
  simply gone the next day; nothing is lost and nothing is said about it.
- **Quest bonus:** each quest done gives 10 XP, on top of the round cap (at most 30 a day).
  `summarise` adds it to the total and to today. This is XP rules **version 2**: as the
  consequences above say, a changed rule changes everyone's XP at once, so past days whose
  quests were done count their bonus too and some learners rise a level with this release.
- **Badges** (`badges.ts`), ten, each earned once for a deed: the first round, the first rule
  card, a round of ten or more questions without a mistake, all 28 letters sorted right, the
  first unit test passed, every unit test of the path passed, 7 and 30 days in a row (the
  longest streak, shields included as the streak counts them), levels 5 and 10. No badge
  depends on other learners, on chance or on a deadline.
- **Where they show:** "Für heute" on Today lists the quests with a bar and the state in words;
  "Dein Fortschritt" counts the badges and leads to `/abzeichen`, which lists all ten with what
  each takes.
- **Not stored:** quests and badges are recomputed from the log, like XP. A badge has no date,
  and one earned by the longest streak can in rare cases change when another device's older
  events arrive and move a shield; storing awards would need a server total, which waits until
  something needs it (teacher views, T5).
- **Suffa:** its quests and badges were not read for this (the nightly run works in this
  repository only); the rules here are ʿArḍa's own and are noted in the port log to compare.

Alternatives: quests that rotate by weekday (more variety, but a goal such as "review" cannot be
met on a day without due cards); badges without XP for quests (a quest with no effect on Today
reads as decoration).

## Update 2026-11-20: "Halte die Ghunna" is a round like the others

The game of spec F6 logs `hold-ghunna` with its right holds out of six. It is a round kind:
the same XP as every round, inside the same daily cap, counted by the quests and badges that
count rounds. No weight changed, so the rules version stays 2. A device that does not know
the kind yet skips the event when it syncs and counts it once it is updated (tested since
ADR-0023).
