# ADR-0011: Reciter audio: streamed with credit, word timings for slow and loop

- Status: proposed
- Date: 2026-10-03

## Context

Step 3 of the learning loop is "hear": a reciter word by word, slowed down and looped, compared
with the student's own recitation. The sheikh decides the reference voice (spec 01 §8,
question 3).

## Decision

- Default reference: **al-Ḥuṣarī, muʿallim** (teaching) recitation, with word timings.
- Audio is **streamed** from its publisher with visible credit; each host is added to the CSP
  `media-src` explicitly (never a wildcard). Nothing is mirrored or cached beyond what each
  publisher's terms allow (ADR-0009).
- Playback: word, āya or range; speeds 0.5×–1×; loop with a pause for repeating; side by side
  with the student's recording.
- The sheikh may record his own examples; these are stored privately in `arda-content` and
  preferred over any public reciter for his students.

## Consequences

Offline playback is possible only for the sheikh's own recordings and for sources whose terms
allow caching.
