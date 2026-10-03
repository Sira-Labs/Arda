# ADR-0007: Qurʾān text model: one word key, many scripts, IndoPak first

- Status: accepted
- Date: 2026-10-03

## Context

The student reads an **IndoPak** muṣḥaf (Ḥafṣ ʿan ʿĀṣim; 13 lines, also printed with 15 and 16
lines). The open tajwīd annotations exist only for the **ʿUthmānī (Madīna)** spelling of the
Tanzil text (ADR-0008). Reciter timings, assignments, marks and recitations must point at the
same place whatever the script.

## Decision

- The unit of reference is the **word**, keyed `riwaya:sura:aya:word`, e.g. `hafs:113:2:1`.
  Assignments, marks, flags and timings point at word keys (or ranges of them), never at
  character offsets of one script.
- Each **script** is a layer over the same word keys: `uthmani` (Tanzil, the base for the
  rules), `indopak` (the student's muṣḥaf), later `madina-qpc` and the riwāyāt (ADR-0017).
  A script stores per word its text and, for page layouts, page and line.
- **Per-word alignment** between scripts is built offline by `tools/` and checked in as data
  with a checksum: same word count per āya is required; differences (e.g. IndoPak's separate
  stop signs, written alifs) are recorded explicitly and reviewed.
- IndoPak text uses U+0652 (sukūn) as the IndoPak fonts expect; the ʿUthmānī U+06E1 is not
  rendered by DigitalKhatt IndoPak (seen while scaffolding) and is mapped during import.
- Text is never altered: the scripts are stored verbatim from their sources (a condition of
  Tanzil's licence, ADR-0009).

## Alternatives

Character offsets into one script (as cpfair's data does): breaks as soon as a second script is
shown.

## Consequences

Everything that marks a place in the Qurʾān is script-independent; adding the Madīna muṣḥaf or
Warsh later adds a layer, not a migration of user data.
