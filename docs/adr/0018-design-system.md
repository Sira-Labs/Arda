# ADR-0018: Design: Suffa's design system, read on paper, with a tajwīd colour layer

- Status: accepted
- Date: 2026-10-03
- Detail: `docs/spec/04-design-system.md`

## Context

ʿArḍa is Suffa's sister and should feel like it; its centre is the muṣḥaf page, which reads
best on warm paper.

## Decision

- **Tokens:** Suffa's palette (deep green-black ink, warm paper, saffron for the one primary
  action, teal for progress and the teacher). Default theme **paper**; **night** for evening
  recitation. Tokens in `apps/web/src/styles/tokens.css`.
- **Type:** Manrope (UI), Fraunces (page titles and brand only; its small optical sizes
  misplace transliteration macrons), Amiri (Arabic UI), **DigitalKhatt IndoPak** (the
  student's muṣḥaf), Amiri Quran (Madīna); all OFL and bundled for offline use.
- **Tajwīd colour families** following the common tajwīd-muṣḥaf convention: green ghunna, blue
  qalqala, grey silent, red madd (darker = longer). **Never colour alone:** every colour has a
  written label (legend, tooltip, rule card), and colours that must be told apart also differ in
  lightness.
- **Navigation** follows the learning loop: Heute · Pfad · Muṣḥaf · Labor · Sheikh; bottom bar
  on phones, sidebar from 960 px.
- **Makhārij drawings** are our own SVGs (no usable open drawings exist), CC BY 4.0, checked by
  the sheikh before release.

## Consequences

Design changes start in the design spec and the tokens, then the components.
