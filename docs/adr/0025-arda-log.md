# ADR-0025: The ʿarḍ log: the sheikh's notebook, filled by his answers and by hand

- Status: accepted
- Date: 2026-10-10
- Related: ADR-0005 (roles and ḥalaqāt), ADR-0012 (recordings and privacy), ADR-0014
  (assignments), spec 01 T4, sprint story S4.3

## Context

Spec 01 T4 asks for the ʿarḍ log: which sūras each student recited, when, and the sheikh's
verdict, "the notebook of the chain, kept for him". Its acceptance is "per student and sūra;
included in the export". ADR-0012 already promises that the teacher's verdicts and marks stay
in the log as text when a student deletes a recording.

Most ʿarḍ does not happen through the app: the student recites to the sheikh in the ḥalaqa,
face to face. A log that only knew recordings would miss most of what he hears.

## Decision

- **One table, `arda_log`** (migration `0013`): ḥalaqa, student, sūra and āyāt, the day of the
  recitation, verdict (`good`/`again`), quick remark, note, marked words, who wrote it, and
  where it came from (`recording` or `in_person`).
- **Answers fill it.** Answering a recording (T3) writes its entry in the same transaction, and
  answering it again rewrites that entry: one entry per recording. Its day is the day the take
  was recorded, on the student's calendar (their time zone, else Europe/Berlin). Voice notes do
  not go into the log: they are a voice, and go with the recording.
- **The sheikh writes the rest by hand:** student, sūra and āyāt, the day (not in the future),
  verdict, remark and note. He can remove any entry of his ḥalaqa; there is no editing, a wrong
  entry is removed and written again.
- **Who reads it:** the ḥalaqa's teachers read the whole log (`halaqa:review`): per student and
  sūra how often, when last and with what verdict, and each student's entries one by one. A
  student reads their own summary per sūra (`recitation:own`), never another student's.
- **What it outlives, and what it does not:**
  - deleting a recording keeps its entry, without the sound (ADR-0012);
  - a student leaving or being removed from the ḥalaqa, or deleting the account, deletes their
    entries (foreign key to the membership, as for recordings and assignments);
  - deleting the ḥalaqa deletes its log;
  - a teacher deleting their account keeps the entries they wrote, without their name.
- **Limits:** 2,000 hand-written entries per student and ḥalaqa; recording entries are bounded
  by the 500 recordings a student may keep.
- **Export:** a student's export lists their entries; a teacher's the entries they wrote.

## Alternatives

- **Only recordings, as a view over `recordings`.** No second copy, but no in-person ʿarḍ, and
  the verdict would go with a deleted take, against ADR-0012.
- **Keep a student's entries after they leave the ḥalaqa** (the chain's notebook outlives the
  circle). Closer to a paper notebook, but it keeps a person's data in a group they left and
  contradicts how recordings and assignments behave. Left open for the owner: the foreign key
  can later point at the ḥalaqa and the account instead of the membership.
- **Editing entries.** More code for something rare; remove and write again does the same.

## Consequences

The recording repository writes into `arda_log` when an answer is given, so the two stay in
step without a job. The log can later be grouped by juzʾ or page, and the per-rule view (T5)
can read verdicts and marks from it.
