# ADR-0017: Muṣḥaf editions and riwāyāt: IndoPak Ḥafṣ first

- Status: accepted
- Date: 2026-10-03

## Context

The student reads an IndoPak muṣḥaf. Others read the Madīna muṣḥaf or other riwāyāt.

## Decision

| Muṣḥaf          | Riwāya                | Layout                    | In ʿArḍa  |
| --------------- | --------------------- | ------------------------- | --------- |
| IndoPak         | Ḥafṣ                  | 13 lines (also 15 and 16) | **first** |
| Madīna          | Ḥafṣ                  | 15 lines                  | second    |
| Madīna editions | Warsh, Qālūn, ad-Dūrī | 15 lines                  | later     |

- A riwāya is part of every word key (ADR-0007); rules, timings and recitations are per riwāya.
- The student chooses muṣḥaf and riwāya once; the teacher of a ḥalaqa can fix them for it.
- IndoPak's own stop signs and spellings are explained in unit 7 (waqf).
- Which IndoPak edition (13, 15 or 16 lines) the sheikh uses decides the first page layout
  (spec 01 §8, question 2).

## Consequences

Unit 8 (riwāyāt) and non-Ḥafṣ packs need rule data beyond cpfair's (ADR-0008).

## Update 2026-10-04: the ʿUthmānī layer comes first

The IndoPak word-by-word text still has no source with a clear licence (ADR-0009 question 1),
and building it from Tanzil would change the text, which Tanzil's terms forbid. So the first
pack, `uthmani-hafs-juz30` (now version 2), carries Tanzil's ʿUthmānī text (the Madīna spelling) with
cpfair's rules, and the first muṣḥaf screen shows it. Word keys are the same for every script
(ADR-0007): the IndoPak layer is added to them as a second pack when its source is cleared,
without touching assignments or progress. The student is told which script is shown.
