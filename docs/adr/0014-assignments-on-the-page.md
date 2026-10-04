# ADR-0014: The sheikh assigns directly on the muṣḥaf page

- Status: accepted (first cut built 2026-10-03)
- Date: 2026-10-03
- Source: Suffa's class assignments (due dates), extended

## Context

The teacher layer from Suffa (classes, roles, invite links, assignments with due dates) gets
one new idea: the sheikh points at the page, the student practises exactly there.

## Decision

- An assignment points at word keys or āya ranges (ADR-0007) and has a type: **Lernen**
  (a unit or rule), **Lesen** (with a reciter, n times), **Nochmal rezitieren**, **Üben** (games
  for a rule), or a **voice note**; optional focus rule (e.g. ikhfāʾ), due date, reminder.
- "Von meinem Sheikh" is the first thing on the student's Today screen, before anything the app
  suggests.
- Completing it sends the recording, the app's pre-check (when on) and what was practised to
  the teacher's listening queue; his verdict and marks go to the ʿarḍ log.

## Consequences

Assignments are the first feature the sheikh can use (week 1 in the plan), before recording
and the speech check exist.

## Update 2026-10-03: T2 built, first cut

- Until the muṣḥaf and its word keys exist (sprint S2), an assignment points at a range of āyāt
  in one sūra, checked against the 114 sūras of `@arda/quran` (Tanzil metadata, ADR-0009).
- Kinds: **Lernen** and **Üben** name a rule (the student goes to its card or game), **Lesen**
  and **Nochmal rezitieren** name āyāt; reading may say how often. The voice note waits for
  recordings (F7) and the reminder for notifications; the sheikh's note is shown as he wrote it
  until remarks are delivered translated (T3, ADR-0020).
- For one student or the whole ḥalaqa; due on a calendar day, so no time zone can move it.
- "Done" is the student's word for now: the teacher sees who is done with each assignment.
  With F7 and T3, completing a recitation assignment will send the recording to his queue.
- A student's own assignments and completions belong to their membership and go with it.
