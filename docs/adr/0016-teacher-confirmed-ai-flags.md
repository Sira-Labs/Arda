# ADR-0016: AI flags that the teacher guides and confirms

- Status: proposed
- Date: 2026-10-03

## Context

This is the feature that ties the teacher to the AI. One remark from the sheikh ("ghunna too
short" on one word) should become a search over the whole recording.

## Decision

1. **He marks**: taps a word and picks a quick remark, or says it in a few words.
2. **It understands**: al-Muʿallim (Suffa's LLM gateway) maps the remark to a rule (e.g.
   ikhfāʾ) and the quality to listen for; this is the only LLM step, and it never sees audio.
3. **It searches**: the tajwīd engine lists every occurrence of that rule in the recording's
   text range; the speech service compares each one with the marked place.
4. **He confirms**: each similar place is shown as a ring next to his filled mark; one tap
   confirms or rejects it. **Only confirmed flags reach the student**, as practice cards.

- Each yes/no is stored as a label for this student and rule. Per rule we measure how often
  the AI agrees with him; when he trusts a rule, he can let its flags go to the student
  directly (a per-teacher, per-rule switch, off by default).

## Consequences

Depends on ADR-0013 and ADR-0012 (opt-in for using labels to improve the model).
