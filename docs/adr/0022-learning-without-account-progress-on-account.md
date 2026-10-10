# ADR-0022: Learning without an account; progress follows the account

- Status: accepted
- Date: 2026-10-07
- Related: ADR-0004 (sign-in), ADR-0010 (offline-first), ADR-0021 (review deck), spec 01 F1,
  A5, sprint story S5.2

## Context

A shared link opened the app on someone else's phone straight into the path, without an
account (owner, 2026-10-07: "es scheint keine richtige Useranmeldung zu geben"). That was by
design but never written down: the learning content (path, rule cards, muṣḥaf, letter lab,
games) is open, and only the ḥalaqa, assignments, recordings and the admin area need sign-in.
Progress (the review deck and the best times, ADR-0021) stayed in the browser of one device, so
it was lost with the device and differed between phone and laptop.

The owner chose to keep learning open and tie progress to the account.

## Decision

- **Learning stays open.** Nobody has to sign in to practise; a first visit from a shared
  link works offline like any other (ADR-0010). Today tells a guest in one quiet card that
  signing in keeps the progress and makes it the same on every device. Everything that involves
  another person (ḥalaqa, assignments, recordings) or the server's costs keeps requiring
  sign-in, as before.
- **Progress lives on the account once signed in.** The deck and the best times are stored per
  person in `review_cards` and `best_times` (migration `0007_progress`) and are part of the
  GDPR export; deleting the account deletes them (foreign key cascade).
- **Sync is a merge of the whole deck, not an operation log.** A deck is a few dozen cards
  per unit, a few kilobytes. The device sends its deck to `POST /api/v1/progress/sync`; the
  server keeps per card the later `updatedAt` (ADR-0021's rule), per game the better time, and
  answers with the merged deck, which the device merges into its own. Both merges are
  idempotent and commutative, so a lost answer or a retry never loses an answer, and no outbox
  is needed. A card dated in the future (a device clock ahead) is stored with the server's time,
  so it cannot win every later merge. The device syncs after sign-in, after a change (with a
  short delay that gathers a game's answers into one request), when it comes back online and
  when the app becomes visible again.
- **The deck on the device has an owner.** The device remembers whose deck it holds
  (`arda.review.owner`). A guest's deck joins the account at the first sign-in: practising
  before signing in is not lost. When a different account signs in on the same device, its
  deck replaces the one on the device instead of merging, so one person's progress never ends
  up on another's account. Signing out keeps the deck on the device until someone else signs
  in. A second tab still showing the previous account learns of the change through the
  `storage` event: it drops its copy, never saves it back and sends nothing.
- **Limits.** At most 5,000 cards and 100 games per person; card ids and texts are bounded.
  The request is refused (413) rather than silently cut.
- **Action `progress:own`** for every role: one's own progress, nobody else's. A teacher
  seeing a student's weak rules (T5) will be a separate, ḥalaqa-scoped action.

## Alternatives

- **Sign-in before learning:** keeps progress from the first answer, but a link shared in a
  family or a mosque would end at a sign-in form, and the first minutes offline would be
  impossible. The owner chose against it.
- **Suffa's event outbox (IndexedDB, one record per answer):** right for engagement events
  that are counted (XP, streaks), more machinery than a last-write-wins deck needs. XP and
  streaks (rest of S5.2) can still add it.
- **Merging the guest deck into whichever account signs in:** simplest, but on a shared
  family device it would mix two people's progress.

## Consequences

- A student keeps the deck when switching devices or reinstalling, once signed in.
- Answers given on two devices offline at the same time are reconciled per card by time; the
  later answer wins, as on one device with two tabs.
- The export lists the deck; the server learns which rules a person struggles with, which is
  also what the sheikh will see in T5.

## Update 2026-10-07: where reading goes on (Weiterlesen)

The owner asked the app to remember where someone last read.

- The page shown in the muṣḥaf is remembered per script (IndoPak as the sheikh's copy numbers
  its pages, Madīna 1–604), with the time it was shown. Today and the muṣḥaf list offer
  "Weiterlesen" on that page, with the sūra it opens with.
- It is part of the progress: on the device with the deck, and once signed in on the account
  (`reading_places`, migration `0010_reading_places`), so the phone opens where the laptop
  stopped. Per script the later page wins, as a card does; a time from a clock ahead is
  stored as now. A guest's place joins the account at sign-in; another account's is dropped
  with its deck.
- The page, not the āya: the page is what a reader of a printed muṣḥaf comes back to. An āya
  or word can be added later without changing how places merge.

## Update 2026-10-10: Mein Lernplan (the student's own notes)

The owner asked for a place where a student notes what they want to learn next ("two pages of
al-Baqara"), what to revise, and what was hard. Asked who reads them, the owner chose: only the
student.

- **A note** has a kind (`learn`, `review`, `difficulty`), up to 500 letters, optionally a place
  in the Qurʾān (āyāt of one sūra, or pages of the IndoPak or Madīna print, opened in the muṣḥaf
  from the note), and whether it is done. `/lernplan` lists them by kind; Today shows the open
  plans to learn and revise.
- **Part of the progress, like reading places:** on the device with the deck, so it works
  offline and without an account; once signed in on the account (`study_notes`, migration
  `0014_study_notes`) and on every device. Per note the later version wins. A deleted note is
  kept as a tombstone without its text or place, so an older device cannot bring it back; 1,000
  notes per person, tombstones included.
- **Private:** no teacher or admin route reads them; they are only in the person's own sync
  answer and export, and go with the account. Sharing a note with the sheikh can be added later
  as a per-note choice without changing how notes merge.
