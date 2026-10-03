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
