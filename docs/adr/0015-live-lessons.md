# ADR-0015: Live lessons on a self-hosted LiveKit server

- Status: proposed (after the pilot's first phase)
- Date: 2026-10-03

## Context

The sheikh teaches one-to-one or in a ḥalqa, partly live. During a live lesson he should be able
to point at the shared muṣḥaf page, mark a word while the student recites and turn that mark
into an assignment.

## Decision

- **LiveKit** (Apache 2.0) on our own server; audio first, video optional. Jitsi stays the
  fallback if LiveKit's TURN setup is a problem on CapRover.
- One shared muṣḥaf page per lesson: the teacher's pointer and marks are sent as data messages
  and appear on every student's page.
- Recording only when every participant agrees; recordings go to `arda-recordings`
  (ADR-0012), are aligned to the text by āya automatically (worker), and the teacher's marks
  stay pinned to the word and the second.

## Consequences

The CSP and `Permissions-Policy` gain the camera and the LiveKit host when this ships.
