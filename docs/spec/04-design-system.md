# 04 — Design System

- Status: v1 · 2026-10-03 · Decision: ADR-0018
- Code: `apps/web/src/styles/tokens.css`, `global.css`, `fonts.css`, `components/`
- Visual reference: the deck "ʿArḍa — Tajweed" (21 slides) and the design canvas
  "ʿArḍa — Design" (https://claude.ai/artifact/P3MUKSdc66uBzVdDZhediX, private until shared)

ʿArḍa is Suffa's sister: the same palette, type and calm, read **on paper**, because the
muṣḥaf page is the centre of the app.

## 1. Principles

1. **The āya is the largest thing on the screen.** Qurʾān text in the student's own muṣḥaf
   script, full tashkīl, generous line height; Latin text supports it.
2. **The teacher comes first.** "Von meinem Sheikh" is the first card on Today; his voice and
   marks are shown in the ink colour, never mixed with the app's suggestions.
3. **One rule, one screen.** Learning screens show one task and hide navigation; overview
   screens show one clear next step.
4. **Colour is never alone.** Every tajwīd colour and every feedback state also has a word.
5. **Calm, warm, honest.** Paper, ink, saffron for the one primary action, teal for progress.
   No gradients except the cover, no emoji icons, no red for "wrong" (the app says "prüfen").
6. **Offline and fast.** Fonts, icons and packs ship with the app.

## 2. Tokens

| Token                                                 | Paper (default)                              | Night                                 | Use                                                                  |
| ----------------------------------------------------- | -------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| `--bg`                                                | `#f6f1e7`                                    | `#0f1714`                             | page                                                                 |
| `--bg-elev` / `--bg-elev-2`                           | `#fffdf8` / `#ede5d5`                        | `#17221e` / `#22302b`                 | cards, the muṣḥaf page / raised controls                             |
| `--mushaf-paper` / `--mushaf-frame` / `--mushaf-rule` | `#fffdf8` / `#3b6f8c` / frame at 35 %        | `#17221e` / `#6fa3c0` / frame at 30 % | the printed page: paper, its double frame, the rules under its lines |
| `--ink` / `--on-ink`                                  | `#10201b` / `#f4eee2`                        | `#0b1310` / same                      | statement surfaces: the sheikh's card, the nav                       |
| `--text` / `--text-muted`                             | `#1b2420` / `#56615b`                        | `#f4eee2` / `#a9b5ae`                 | text (15.7:1 / 6.3:1 on paper)                                       |
| `--border`                                            | `#dcd2bf`                                    | `#2e3d37`                             | hairlines                                                            |
| `--accent`                                            | `#8a5a12`                                    | `#e8a93b`                             | eyebrows, links (text-safe saffron)                                  |
| `--accent-fill` / `--on-accent`                       | `#e8a93b` / `#1a1206`                        | same                                  | the one primary action (9.0:1)                                       |
| `--accent-2` / `--on-accent-2`                        | `#1f7a6d` / `#f4eee2`                        | `#3fb5a3` / `#06201c`                 | progress, done, teacher actions                                      |
| `--good` / `--check` / `--bad` / `--info`             | teal / saffron-brown / `#b4432b` / `#25609b` | lighter variants                      | feedback; `check` is not a failure                                   |

Shape: radii 12 / 16 / 24 px; tap target 44 px; spacing unit 16 px; floating nav 72 px.

## 3. Typography

| Role            | Font                     | Where                                                                          |
| --------------- | ------------------------ | ------------------------------------------------------------------------------ |
| UI              | Manrope (variable)       | everything Latin, `h2`, `h3`                                                   |
| Title           | Fraunces (variable)      | `h1` and the brand only: its small optical sizes misplace the macrons of ā ī ū |
| Muṣḥaf, IndoPak | **DigitalKhatt IndoPak** | `.quran` (default script)                                                      |
| Muṣḥaf, Madīna  | Amiri Quran              | `.quran[data-script='madina']`                                                 |
| Arabic UI       | Amiri                    | letters in lists, the alphabet, short quotes                                   |

Scale: 17 px base; `h1` 2.1 rem; `h2` 1.5 rem; `h3` 1.15 rem; eyebrow 0.78 rem, 0.12 em
tracking, uppercase. Qurʾān: 2.4 rem body, 3.2 rem hero, both × `--quran-scale` (a setting).
All fonts are SIL OFL and bundled; the IndoPak font's licence sits next to it.

## 4. The tajwīd colour layer

Follows the common tajwīd-muṣḥaf convention. Each colour has ≥ 3:1 contrast on its background
(Qurʾān text is large text); green ghunna also differs in **lightness** from the madd reds, the
pair colour-blind readers confuse most.

| Family   | Paper              | Night     | Label (German UI)                     | Rules                                                         |
| -------- | ------------------ | --------- | ------------------------------------- | ------------------------------------------------------------- |
| ghunna   | `#1f7a35` (4.8:1)  | `#8fdc9b` | Ghunna · Nasenklang, 2 Zählzeiten     | ikhfāʾ, idghām with ghunna, iqlāb, shafawī, mushaddad nūn/mīm |
| qalqala  | `#2464b0` (5.3:1)  | `#6aa6e6` | Qalqala · Rückprall                   | qalqala                                                       |
| silent   | `#86867f` (3.3:1)  | `#8e9893` | Stumm · geschrieben, nicht gesprochen | hamzat al-waṣl, lām shamsiyya, idghām without ghunna          |
| madd 2   | `#c85e52` (3.6:1)  | `#e98a7a` | Madd 2 · natürliche Dehnung           | ṭabīʿī                                                        |
| madd 4–5 | `#a32b22` (6.4:1)  | `#e0604e` | Madd 4–5 · verbunden / getrennt       | muttaṣil, munfaṣil                                            |
| madd 6   | `#6e1813` (10.4:1) | `#d4513f` | Madd 6 · notwendig                    | lāzim                                                         |

Rules for using it:

- Colour **single letters inside a word** with spans; joining is kept (checked with
  DigitalKhatt IndoPak).
- Every coloured letter has its rule name as an accessible title and opens the rule on tap.
- A legend with names is visible wherever colours appear; the rule card repeats name and
  colour together ("grün = Ghunna, 2 Zählzeiten").
- The student can switch colours off per family (practice without help) and on again.

## 5. Layout and navigation

- **Phone:** floating ink bottom bar with five destinations in the order of the loop:
  **Heute · Pfad · Muṣḥaf · Labor · Sheikh**. Account sits in Today's header.
- **Desktop (≥ 960 px):** ink sidebar with the brand on top; content column ≤ 960 px.
- **Learning screens** (a station, a game, recording) hide the bar and show a close button and
  progress.
- One navigation definition (`components/AppShell.tsx`) drives both layouts.

## 6. Screens (from the deck)

| #   | Screen           | Route                      | Key elements                                                                                                                                  | Status                                                                                  |
| --- | ---------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| —   | Sign-in          | `/anmelden`                | email → link + code; passkey; "no password"                                                                                                   | built                                                                                   |
| —   | Account          | `/konto`                   | devices, passkey, sign-out                                                                                                                    | built                                                                                   |
| 0   | Today            | `/`                        | "Von meinem Sheikh" (ink card) first, next unit (paper card, +XP chip), colour legend                                                         | built (assignments live; next unit placeholder)                                         |
| 1   | Rule card        | `/pfad/:unit/:rule`        | Arabic rule name, rule on one line, coloured example on paper, Play / Slow 0.5×, numbered steps, "where sources differ" note, Ask al-Muʿallim | built for unit 2 (no audio, no Ask yet)                                                 |
| 2   | Muṣḥaf           | `/mushaf`, `/mushaf/:sura` | IndoPak page, script chips (IndoPak · Madīna · Warsh), tap a letter → ink sheet with rule, "Hear it · Practise 5 more", legend                | built: IndoPak and Madīna printed pages (S3.4, S3.5), tap a word for its rules, offline |
| 3   | Letter lab       | `/labor/:letter`           | side view of the head, five coloured areas, numbered points, letter list per area                                                             | week 4                                                                                  |
| 4   | Games            | `/pfad/:unit/spiel/:game`  | Which rule? · Sort the 28 · Hold the ghunna; XP, quests, streak shields; review at `/pfad/wiederholen`                                        | built: Which rule?, Sort the 28, review                                                 |
| 5   | Recite           | `/rezitieren/:range`       | text with `gut` / `prüfen` per word (label next to colour), finding card, Yours ↔ Reciter, **Send to my sheikh** (primary)                    | week 4                                                                                  |
| 6   | Sheikh (student) | `/sheikh`                  | "Von meinem Sheikh" list: type chip, range, focus, due date; voice notes                                                                      | built on Today and the ḥalaqa page (T2); voice notes later                              |
| 7   | Ḥalaqa (teacher) | `/halaqa/:id`              | invite link and QR code, students waiting and approved, assignments and who is done; then the listening queue, the ʿarḍ log, rule by rule     | built: invites, members, assignments (T1, T2)                                           |
| 8   | Live lesson      | `/live/:id`                | shared page, his pointer, recording cut by āya                                                                                                | later                                                                                   |
| 9   | AI flags         | inside 7                   | filled mark (his) vs ring (AI), one tap yes/no                                                                                                | later                                                                                   |

## 7. Components

CSS classes in `global.css`: `tj-follower` (the letter that decides a rule: underlined, never
coloured), `learning`, `progress`, `btn-round`, `note`, `examples`, `tj-focus` (the letter a question
asks about, neutral), `options`, `option-right`, `option-chosen`, `answer`, `card`, `card-ink`, `card-teal`, `paper` (the muṣḥaf page, gold
hairline `#c9b98f`), `btn`, `btn-primary` (saffron), `btn-teal`, `input`, `chip`, `eyebrow`,
`stack`, `row`, `muted`, `feedback-good`, `feedback-bad`, `arabic`, `quran`, `quran-lg`, `tj`
with `data-rule`, `legend`. React: `AppShell`, `Icon` (line icons, 24 px grid, currentColor),
`TajweedText` (segments → coloured spans with titles; segments come from `segmentsOf(text)`,
which runs the engine), `LearningShell` (close and progress instead of the bar), `Logo`, `LogoLockup` and
`BrandHeader` (§11).

Phone mock-ups in the deck use a device frame with a 60 px radius and a 12 px ink border; the
app itself never draws a frame.

## 8. States and voice

- **Offline:** a quiet line, never a modal: "Offline – du lernst weiter, dein Sheikh sieht es
  beim nächsten Verbinden."
- **Draft content:** a small "Entwurf" badge until the sheikh has reviewed it.
- **Feedback words:** `gut`, `prüfen` (never "falsch"); the teacher's verdict is his own words.
- **Voice:** German, _du_, short sentences, Arabic terms in transliteration with marks
  (Ghunna, Iqlāb, Muṣḥaf), Arabic script where the letter itself matters.
- **Greeting:** "Assalāmu ʿalaikum".

### Languages and direction (ADR-0020)

- Four interface languages: German (source), English, French, Arabic. Catalogs in
  `apps/web/src/i18n/messages/`; every string in all four.
- **Arabic** turns the document `dir="rtl"`: the shell, cards and lists mirror (logical CSS
  properties only), lists use Arabic-Indic numbering, the brand reads العَرْضة, the UI font is
  IBM Plex Sans Arabic. Numbers with signs ("+20 XP"), e-mail addresses and codes stay
  left to right.
- **Terms stay terms:** Ghunna, Ikhfāʾ, … in German, English and French; غنة، إخفاء، … in
  Arabic. Glosses are translated.
- French uses a narrow no-break space before `? : ; !` and inside « ».
- **The teacher's words:** a machine translation always carries "maschinell übersetzt" (in
  the reader's language) and keeps the original one tap away; the teacher sees the preview
  before sending.

## 9. Accessibility

WCAG 2.2 AA: text ≥ 4.5:1, large text and Qurʾān glyphs ≥ 3:1; touch targets ≥ 44 px; visible
focus (`--focus`); `prefers-reduced-motion` respected; `lang="ar" dir="rtl"` on every Arabic
run; screen readers get rule names from titles; adjustable Qurʾān size.

## 10. Illustrations

Makhārij drawings are our own SVGs (no usable open drawings exist): a side view of the head in
ink lines on paper, the five areas in the token colours (jawf teal, ḥalq blue, lisān saffron,
shafatān red, khayshūm green), numbered points, animated tongue and lips. Licensed CC BY 4.0
and reviewed by the sheikh before release (ADR-0018).

## 11. Logo

The mark is an eight-pointed star of two squares, the second turned by 45°, stroked in saffron
(`--brand-saffron`, `#e8a93b`) on ink (`--ink`, `#10201b`). It comes in three forms, all in
`components/Logo.tsx`:

| Form    | Drawing                                                                      | Where                                        |
| ------- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| `tile`  | star and a teal centre (`--brand-teal`, `#3fb5a3`) on a rounded ink square   | favicon, app icons, Today's header on phones |
| `star`  | star and teal centre alone                                                   | ink surfaces: the sidebar, beside the name   |
| `rings` | star inside two teal rings (r 226 and 160 of 560, the inner at 60 % opacity) | the sign-in header, the repository logo      |

The wordmark is "ʿArḍa" in Fraunces 600 (Amiri draws the ʿayn, which Fraunces lacks) and
"العَرْضة" in DigitalKhatt IndoPak, always `lang="ar" dir="rtl"`. The sign-in page opens with
the brand header of the design: ink, rounded lower corners, the mark, the Arabic name, the name
and the tagline ("Rezitieren, gehört werden, korrigiert werden."). Saffron and teal stay the
same in both themes. `npm run icons -w @arda/web` draws the PWA icons
(`public/icons/`: 192, 512, maskable 512 with the star inside the safe circle, Apple 180);
`apps/web/scripts/logo-svg.py` writes `docs/assets/logo.svg` with the text outlined.
