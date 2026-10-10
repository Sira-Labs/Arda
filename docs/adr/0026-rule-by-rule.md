# ADR-0026: Rule by rule: the sheikh sees counts of open mistakes and his own remarks

- Status: accepted
- Date: 2026-10-10
- Related: ADR-0005 (roles and ḥalaqāt), ADR-0021 (review cards), ADR-0022 (progress on the
  account), ADR-0025 (ʿarḍ log), spec 01 T5

## Context

Spec 01 T5 asks for "who still struggles with which rule". ADR-0021 shaped the review deck so
the sheikh could read it at a glance, and ADR-0022 said that seeing a student's weak rules would
be "a separate, ḥalaqa-scoped action". Two signals exist today:

- a student's practice: every game mistake is a review card on the account, with the rule card
  it asked for, its Leitner box and how often it was missed;
- the sheikh's own word: the quick remarks in the ʿarḍ log, each about one rule or sound.

## Decision

- **A new action, `halaqa:rules`** (teacher of that ḥalaqa, or admin), for
  `GET /halaqat/:id/rules`. Students, classmates included, never see it.
- **Per active student and topic**, only counts:
  - practice: the cards on that rule card still in box 1 or 2 (a mistake not yet mastered) and
    their lapses; mastered cards (box 3 and up) are left out;
  - remarks: the teachers' remarks with verdict `again` of the last 90 days, mapped to a topic
    (ghunna too short or long → ghunna; nūn too clear → ikhfāʾ; qalqala missing → qalqala;
    madd too short → madd; sīn, zāy, rāʾ → the letters' articulation).
    Only topics with something open are returned; the heaviest first. No prompts, answers or
    times of practice leave the database.
- **Topics** are the nine rule cards of the path, plus madd and makhārij for the remarks that
  speak of them.
- **The student is told** on their ḥalaqa page that the sheikh sees how many mistakes they still
  make per rule in the games, not their answers.
- A student leaving the ḥalaqa leaves the view with it (active members only; their ʿarḍ log
  entries are deleted anyway).

## Alternatives

- **Rules from the marked words:** a marked word can carry several rules, so a mark cannot be
  pinned on one without the sheikh saying which. Left for when he names the rule with the mark.
- **Asking each student to share:** a per-student switch. More friction for a view that only
  shows counts to the teacher the student chose to learn with; the notice on the ḥalaqa page is
  the transparency instead. It can be added without changing the route.
- **Showing the student's whole deck:** more than the teacher needs, and it would expose what
  the student practised and when.

## Consequences

The view is computed on request from `review_cards` and `arda_log`; no new table. When the
speech check (ADR-0013) or confirmed flags (ADR-0016) exist, they can add a third signal per
topic.

## Update 2026-10-10: the rule of a marked word

The owner asked for the alternative above: when the sheikh marks a word, he can say which rule
it was about.

- **A mark has an optional topic** (`recording_marks.topic`, migration `0015_mark_topics`;
  the same topics as above). A mark without one stays a mark.
- **Chosen for him when the word says it:** the app looks up the word's rules in the content
  pack (cpfair's names mapped to the sheet's rules, every madd to madd; followers and silent
  letters left out); a word with exactly one is marked for it, and he can change or clear it.
- **Counted in rule by rule:** named marks of the last 90 days (from the answer's ʿarḍ log
  entry, so they stay when the take is deleted) count beside the remarks; the view shows "n words marked" (every teacher of the ḥalaqa counts, so the labels name no one) and the day of the last remark or mark.
- **The student sees the rule** of each marked word under the answer.
