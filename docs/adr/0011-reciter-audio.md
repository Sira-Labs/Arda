# ADR-0011: Reciter audio: streamed with credit, word timings for slow and loop

- Status: accepted (2026-10-05)
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

## Update 2026-10-05: the player ships (S3.1)

- **Reciters (owner, 2026-10-05):** al-Ḥuṣarī, muʿallim (the default) and murattal, and Māhir
  al-Muʿayqilī. The sheikh's answer to question 3 may add or reorder them.
- **Recordings:** EveryAyah's āya-by-āya files (`everyayah.com/data/<folder>/SSSAAA.mp3`; a
  sūra's basmala is al-Fātiḥa 1), streamed with credit, never mirrored or precached by the
  app. `media-src` allows `https://everyayah.com` only. ADR-0009 question 2 (EveryAyah's terms
  for a free app) stays open; if the answer is no, the folder names change, not the player.
- **Word timings:** quran-align (Collin Fair, CC BY 4.0) times every word of EveryAyah's
  al-Ḥuṣarī recordings against the Tanzil words, the words our keys count (6,225 of 6,236
  āyāt match the word count exactly; in the shipped sūras every āya does, 2:181 lacks one
  word's time). `npm run timings -w @arda/tools` keeps those of the shipped sūras in
  `apps/web/public/audio/timings/`, checked and pinned like the packs. So the Quran.com API
  registration is no longer needed for the player.
- **Māhir al-Muʿayqilī** has no open word timings: his āya is marked whole while he recites
  it. Timings for him would come from running quran-align on his recordings (later).
- **Playback:** the page or a tapped word's āya; 0.5×, 0.75×, 1×; repeat with a 1.2 s pause to
  repeat after him; a turned page falls silent. Reciter and speed are kept on the device.
- **Choosing an āya (owner, 2026-10-05, after trying it):** tapping a word marks its āya, and
  the word's sheet offers the āya first: "Abspielen" plays from it to the page's end,
  "Wiederholen" loops it alone. While a recitation plays or is paused, a compact player is
  docked above the navigation (pause or go on, repeat, stop), and the page scrolls to keep the
  recited word in sight; the controls never scroll away. "Seite anhören", the reciter and the
  speed stay above the page.
