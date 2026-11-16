# ADR-0013: Speech check: an open model, self-hosted, switched on per rule

- Status: proposed (needs a measurement on students first)
- Date: 2026-10-03
- Source: Suffa ADR-0022 (pronunciation assessment with Arabic speech models)

## Context

Step 5 of the loop gives a first check right after reciting, before the teacher listens.
Tarteel's own help centre says its AI does not yet recognise tajwīd mistakes. **Quran Muʿallim**
(obadx, MIT, ~660 M parameters, 1.5 GB GPU memory) recognises phonemes and ten letter
qualities (ṣifāt) including ghunna, madd, qalqala and tafkhīm, and covers all tajwīd rules
except ishmām. It was trained on about 850 hours of professional reciters.

## Decision

- Run Quran Muʿallim as an internal service `arda-speech` (HTTP, no internet access), called
  by the worker (ADR-0003). Recordings never leave our servers.
- The check compares the recognised phonemes and ṣifāt with the expected ones from the tajwīd
  engine (ADR-0008) at word level, and returns per word `good` or `check` with the rule it
  concerns. It never says "wrong": the teacher decides.
- **Per-rule gate:** a rule's automatic check is shown to students only after it agrees with
  teachers' verdicts often enough on real student recordings (target ≥ 90 % agreement on a
  labelled set of ≥ 200 occurrences per rule, measured per riwāya and script). Until then its
  output goes only to the teacher's queue as a hint.
- Evaluation data comes only from students who opted in (ADR-0012).

## Alternatives

Hosted speech APIs: no tajwīd awareness, and recordings would leave our infrastructure.
Browser speech recognition (as Suffa's first step): not precise enough for ṣifāt.

## Consequences

Needs a GPU host or a CPU budget measured first (spec 02 §7, open item). The app is fully
useful without it: the teacher hears every recitation.

## Update 2026-11-15: the api's side of the check (S6.1, first part)

The service itself waits for its host (owner). What does not need the host is built, so that a
running `arda-speech` only has to be pointed at: the contract, where hints are kept and who
sees them.

- **Contract.** The api calls the service, never the other way round, so the service needs no
  way into the api or the database and no internet access:

  ```
  POST {ARDA_SPEECH_URL}/v1/check?sura=&from=&to=&riwaya=hafs
  Authorization: Bearer {ARDA_SPEECH_TOKEN}        Content-Type: the take's format
  body: the sound
  → 200 { "model": "…", "words": [{ "aya": 1, "word": 2, "topic": "ghunna", "verdict": "check" }] }
  ```

  It gets the sound and what is recited, nothing about the student or the ḥalaqa. Words are
  counted as the content packs count them (like the teacher's marks); `topic` is one of the
  marks' topics (the nine rule cards, `madd`, `makhraj`), so a hint and a mark on the same word
  can be compared rule by rule; `verdict` is `good` or `check`, never "wrong". The api treats
  the answer as input: a word outside the recited āyāt, an unknown topic or a repeated word and
  topic fails the whole answer, and nothing of it is kept. Redirects are not followed.

- **Who runs it.** Until the worker role exists (ADR-0003) the api does, in small turns: every
  30 seconds it takes one recording that was never checked, asks the service (two minutes at
  most) and keeps the hints. A claim is a lease in `recording_checks` (ten minutes), so two api
  instances never check the same take and a check lost with its instance is taken up again; a
  recording the service cannot hear is tried three times and then left alone. A claim is named
  by its try: what a taker writes back counts only while the check is still on that try, so one
  whose lease ran out cannot overwrite its successor's hints. When the api stops, the check
  under way is ended, its try given back uncounted, and the database closes after that. Recordings made
  before the service existed are checked too, oldest first.
- **Where hints are kept.** `recording_hints` (migration `0017`): recording, āya, word, topic,
  verdict. They go with the recording, like its marks (ADR-0012). `good` hints are kept as
  well: the agreement report (S6.2) needs both sides.
- **Who sees them.** Only the teachers of the recording's ḥalaqa, in their listening queue
  (`halaqa:review`): the words to check are ringed and listed with their rules under the text,
  named as hints of an automatic check. A hint marks nothing: the teacher taps a word himself,
  and only his marks are sent, stored in the ʿarḍ log and shown to the student. The student's
  own list never reads the table; a route test and the Postgres suite hold that.
- **Off by default.** Without `ARDA_SPEECH_URL` and `ARDA_SPEECH_TOKEN` (in prod at least 32
  random characters) nothing is asked and `/healthz` reports `speech: disabled`; half of the
  two, or a weak token, switches it off with a loud log line instead of stopping the api.
- **Not yet:** the service (model, alignment, the engine's expected ṣifāt), the opt-in for
  evaluation (ADR-0012) and the agreement report per rule (S6.2), the gate that lets a rule's
  check reach students, the admin's view of failed checks. The account export does not list
  hints: they are about the student, but shown before a rule has passed its gate they would be
  read as verdicts. Whether the export must carry them is a legal question for the owner.

Alternatives: the service pulling work from the api with its token (it would need a way into
the api and a second route × role surface for a machine); hints inside the queue's JSON only,
without a table (nothing to measure agreement on); checking at upload (a slow model would hold
the student's upload open, and offline takes arrive in bursts).

## Update 2026-11-16: the opt-in and the agreement per rule (S6.2)

Built without the service, like the api's side before it: once hints exist, the measurement
is there.

- **The opt-in.** A student allows, on the account page, that their recitations count when the
  check is measured against the teacher. It is separate from the consent to record, off until
  given, revocable, audited (`speech.evaluation_opted_in`, `…_opted_out`) and part of the
  export; it goes with the account (`speech_evaluation_optins`, migration `0018`). It is
  offered only where a speech check is configured, and can always be taken back. It allows
  counting only: nobody hears a recording who could not before, and nothing is used for
  training (ADR-0012 keeps that for a separate opt-in).
- **What is counted.** Recordings of a ḥalaqa that a teacher answered, the check heard, and
  whose student is opted in at the moment of asking. Taking the opt-in back therefore takes
  the student's recitations out at once; no labels are stored apart from the recordings.
- **How a word is compared**, per model and topic, for every word the check judged on that
  topic:
  - `check` and the teacher marked the word for this topic, or `good` and he left the word
    unmarked: they agree;
  - `check` and the word unmarked: a false alarm; `good` and the word marked for this topic:
    a miss;
  - the word marked for another topic or for none he named: **not compared**. He names one
    rule per word, so such a mark says nothing about this topic either way.
    Words he marked for a topic that the check did not judge on it are counted beside the table
    (`unheard`), not in the share.
- **The gate as a number.** A row reaches the gate at ≥ 200 compared words and ≥ 90 %
  agreement. The report says so; nothing is switched on by it. Showing a rule's check to
  students stays a decision of its own, taken across ḥalaqāt, and is not built.
- **Who sees it.** The teachers of the ḥalaqa (`halaqa:review`), as counts per model and rule:
  no word, no student, no recording. A new model starts its own rows.
- **A known weakness: the teacher sees the hints while he marks.** A ringed word invites a
  mark, so agreement measured this way runs higher than it would blind. S6.1's acceptance puts
  the hints in his queue, so this run keeps that; whether hints should stay hidden until he
  has answered, for recordings that count, is the owner's and the sheikh's call (sprint plan).
  Until then the numbers are an upper bound, and the report's note says they decide nothing.

Alternatives: storing a label per word when the teacher answers (survives a deleted recording,
but a revoked opt-in would have to chase its labels); counting a mark for another rule as
disagreement (punishes the check for a limit of the marking screen); one report across all
ḥalaqāt for admins (needs a view of other teachers' work that ADR-0005 does not give).
