# 01 — Product Specification: **ʿArḍa** (العَرْضة)

- Status: draft v1 · 2026-10-03 · Owner: product owner (Sira Labs)
- Related: deck "ʿArḍa — Tajweed" (21 slides, 2 October 2026), the sheikh's sheet "Tajweed –
  Regeln zum Ausdrucken", ADR-0001 to ADR-0019, [02 technical](02-technical-spec.md),
  [03 content and tajwīd](03-content-and-tajweed-spec.md), [04 design](04-design-system.md)

## 1. Name

**ʿArḍa** — each Ramaḍān Jibrīl reviewed the whole Qurʾān with the Prophet ﷺ; in his last year
twice, _al-ʿarḍa al-akhīra_. _ʿArḍ_ is still how the Qurʾān is passed on: the student recites,
the teacher corrects. Everything in the app prepares that moment (ADR-0001).

## 2. Vision

> **Recite, be heard, be corrected. Tajwīd, learned the way it was always taught.**

A tajwīd student has three things, never together: **the rule on paper** (precise but silent:
a sheet cannot say a ghunna out loud), **the sound without feedback** (a hundred reciters online,
nobody says whether your ghunna lasted two counts), and **the teacher once a week** (the best
correction, but late, so mistakes settle in between lessons). ʿArḍa puts the rule, the sound and
the teacher **on the same āya**.

### What exists today (checked 2 October 2026)

| App                      | Strong at                           | Missing                            |
| ------------------------ | ----------------------------------- | ---------------------------------- |
| Tarteel                  | hears word and ḥaraka mistakes      | no tajwīd checks yet (its own FAQ) |
| Muʿallim al-Qurʾān       | free colour-coded tajwīd, audio     | no practice loop, no teacher       |
| Learn Quran Tajwid       | lessons, makhārij pictures, quizzes | paid; no feedback on your voice    |
| Quranic, Quran Companion | games, streaks, vocabulary, ḥifẓ    | not built for tajwīd               |

None combines practice rule by rule, feedback per letter, a teacher who listens, riwāyāt beyond
Ḥafṣ, and open source you can host yourself. That is ʿArḍa's place.

### Goals (first 6 months)

1. The sheikh assigns work on the page and hears his students' recitations in one queue.
2. Units 2–4 (from his sheet) are playable, with games, in the IndoPak muṣḥaf.
3. Juzʾ ʿAmma in IndoPak with tajwīd colours and word-by-word reciter audio.
4. A pilot ḥalaqa uses it weekly; the automatic check is measured against the sheikh.

### Non-goals

- Issuing an ijāza or grading a student's recitation as final. The app never replaces the
  teacher.
- Ḥifẓ tracking beyond what the ʿarḍ log records; translation and tafsīr.
- Hosting third-party audio or text we have no right to redistribute (ADR-0009).

## 3. Personas and roles

| Persona                                         | Role          | Needs                                                                                                                     |
| ----------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **The student** (adult or youth, reads IndoPak) | `student`     | Understand a rule, hear it, practise it, recite and get corrected between lessons; works offline                          |
| **The sheikh**                                  | `teacher`     | Point at the page, hear recitations in one place, answer with his voice, see who struggles with which rule; little typing |
| **A parent** (for young students)               | — (v2)        | See assignments and progress; gives consent for recordings                                                                |
| **The admin** (Sira Labs)                       | `admin` + 2FA | Make a sheikh a teacher, manage users, read the audit log                                                                 |

Platform roles and ḥalaqa scope: ADR-0005.

## 4. The learning loop

One rule, five steps, every time:

1. **Understand** — a rule card in your language, written from your sheikh's material.
2. **See** — the rule coloured in the muṣḥaf; tap any letter to see why.
3. **Hear** — a reciter word by word: slowed down, looped, compared.
4. **Locate** — where the sound comes from: the makhraj, drawn and animated.
5. **Recite** — record it, get a first check, send it to your teacher.

**Then it comes back:** every mistake, from you or your teacher, becomes a spaced-repetition
card, so the rule returns until it holds.

### The path: eight units, from letter to riwāya

| Unit  | Topic                                                                       | Source                         |
| ----- | --------------------------------------------------------------------------- | ------------------------------ |
| 1     | Makhārij & ṣifāt: five areas, seventeen points                              | classical order (al-Jazariyya) |
| **2** | **Nūn sākina & tanwīn**: iẓhār, idghām, iqlāb, ikhfāʾ (6 + 6 + 1 + 15 = 28) | **the sheikh's sheet**         |
| **3** | **Ghunna & mīm sākina**: always two counts; the three shafawī rules         | **the sheikh's sheet**         |
| **4** | **Qalqala**: ق ط ب ج د with sukūn, _quṭbu jadd_                             | **the sheikh's sheet**         |
| 5     | Madd: natural, joined, separated, necessary                                 | classical order                |
| 6     | Tafkhīm & tarqīq: heavy and light letters, the lām of Allāh, the rāʾ        | classical order                |
| 7     | Waqf & ibtidāʾ: where to stop and start; the signs of your muṣḥaf           | classical order                |
| 8     | Riwāyāt: what changes in Warsh, Qālūn, Shuʿba and others                    | later                          |

Every unit has stations and ends with a unit test (Suffa's structure). A passed test marks the
unit on the path and recommends the next one; nothing is locked (ADR-0024). Units 2–4 have
their test; unit 1 (the letter lab) gets one when the lab has all 28 letters. Every text is
a draft until the sheikh has reviewed it.

## 5. Feature specification

Priorities: _Must_ (pilot), _Should_ (first year), _Could_.

### A — Accounts and sign-in _(Must, built)_

Suffa's sign-in, ported (ADR-0004).

- **A1 Sign in by link or code.** Email → one mail with a link and a six-digit code; both valid
  15 minutes, once. **Acceptance:** link signs in this browser; code signs in another; wrong
  code 5× locks it; a link cannot redirect off-site; 5 mails / 10 min per client.
- **A2 Passkeys.** Add one on the account page (fresh session), then one-tap sign-in.
  **Acceptance:** sign-in without typing an email; a passkey without user verification is
  refused; listing never shows key material.
- **A3 Devices.** List sessions, end one or all others. **Acceptance:** an ended session fails
  on its next request; another user's session can never be ended.
- **A4 Admin.** Users list and search, change role, disable (ends all sessions), audit log;
  every admin action needs TOTP confirmed in this session. **Acceptance:** without 2FA → 403
  `second_factor_required`; a used code works once; every change is in the audit log. _(Web
  built (owner, 2026-10-06): the second factor set up and confirmed on the account page with a
  QR code; `/verwaltung` lists and searches people, changes a role (a sheikh becomes a teacher)
  and blocks or unblocks; one's own role is never offered. Next: the audit log on the page.)_
- **A5 Privacy.** Export everything as JSON; delete the account by typing the own address.
  **Acceptance:** export contains no tokens or keys; deletion cascades and is audited without
  the person.

### F1 — The path and units _(Must)_

Units with stations (rule card, muṣḥaf, hear, letter lab, games, recite) and a unit test.
XP, daily quests, streak with shields from Suffa's engagement rules. **Acceptance:** unit 2 is
playable end to end offline; passing its test marks it and recommends unit 3 (ADR-0024).

Learning needs no account (ADR-0022): a guest practises the path, the games and the lab offline
and is asked, in one quiet card on Today and the path, to sign in so the progress is kept.
_(Built (owner, 2026-10-07): signed in, the review deck and the best times sync with the
account across devices; a guest's deck joins the account at the first sign-in, another
account's deck on the same device is replaced, never merged.)_
_(Built (owner, 2026-10-07, ADR-0023): every finished round and every rule card read to its
end goes into an activity log synced with the account; Today shows level, XP, the streak and
its shields, the end of a round its XP. Daily quests and badges are next.)_
_(Built (owner, 2026-10-07, S5.1): the path shows units 1–4. Unit 1 leads to the letter lab
(sīn, zāy, ṣād, rāʾ so far); unit 3 has four cards (ghunna of a shadda and the three mīm
sākina rules) and its "Which rule?", unit 4 the qalqala card and the qalqala letters.)_
_(Built (owner, 2026-10-07, ADR-0024): units 2–4 end with a test of ten questions; eight right
pass it, which marks the unit on the path and recommends the next one, without locking it.)_

### F2 — Rule cards _(Must)_

"The sheet, made audible": each rule as the sheikh wrote it, each example playable, three
cases where they exist (inside a word, across words, after tanwīn), "Ask al-Muʿallim" answers
from the card only, and **"where sources differ, we say so"** (iqlāb with ghunna; the sheikh
can add his note). **Acceptance:** every example on the sheet appears on a card with audio;
the rule taxonomy test passes (03 §3).

### F3 — The muṣḥaf with tajwīd colours _(Must)_

IndoPak 15-line pages (the sheikh's edition, §8) in DigitalKhatt IndoPak; rule colours with labels; tap a coloured letter
→ rule, reciter audio, "practise 5 more". Script switch (IndoPak, Madīna, later Warsh).
**Acceptance:** Juzʾ ʿAmma renders with every cpfair rule mapped onto the IndoPak word; colour
is never the only signal. _(Built: al-Fātiḥa, al-Baqara and Juzʾ ʿAmma in IndoPak (the sheikh's
15-line pages, his page numbers) and in the Madīna script (its 604 pages), every cpfair rule
labelled, tap a word for its rules, plain ink on request, framed and ruled like the print,
turn the pages by swiping (never while zoomed), offline after the first visit; audio next,
ADR-0017 updates.)_

### F4 — Hear: reciter player _(Must)_

Word, āya or range; 0.5×–1×; loop with pause; "yours vs reciter". Default al-Ḥuṣarī
muʿallim (ADR-0011). **Acceptance:** word highlighting follows the timings within 100 ms.
_(Built: the page, or a tapped word's āya played on or repeated, a docked player that stays
in reach, al-Ḥuṣarī muʿallim and murattal marked word by word,
Māhir al-Muʿayqilī too, 0.5×–1×, repeat with a pause; "yours vs reciter" comes with
recording, F7.)_

### F5 — Letter lab (makhārij) _(Should)_

Side view of the head with the five areas (jawf, ḥalq, lisān, shafatān, khayshūm); tap a
letter → its point lights up, slow audio, tongue or lips move. The sheet's rule becomes a
picture: all six iẓhār letters come from the throat. **Acceptance:** 28 letters mapped; SVGs
reviewed by the sheikh. _(Built: the first set (owner, 2026-10-06), the three whistling letters
س ز ص and ر, at `/labor` and `/labor/:letter`: our own head drawing with the five areas
numbered and named, the letter's point pulsing with a label, makhraj in plain words, ṣifāt with
a one-line meaning each, typical mistakes of German speakers, real words from the packs played
word by word from al-Ḥuṣarī's teaching recitation (0.5×–1×), the listening quiz "Welcher
Buchstabe?" (rāʾ: heavy or light), pairs to compare, all marked draft for the sheikh; an āya with
the letter recorded and sent to him (F7). Not yet animated.)_
_(Built (owner, 2026-10-07): the throat, ء ه ع ح غ خ, with its three points (deepest, middle,
nearest the mouth), ten words each and the pairs that differ in that letter only (ʿalīm / alīm,
ʿammā / ammā, ʿayna / ayna, uḥilla / uhilla, khayra / ghayra, yakhshā / yaghshā). Each letter is
heard against the ones it is mixed up with: hamza or ʿayn; hāʾ, ḥāʾ or khāʾ; khāʾ or ghayn.)_
_(Built (2026-10-09): the back and middle of the tongue, ق ك ج ش ي, with three points on the
drawn tongue (qāf where it meets the soft palate, kāf just before it, the middle three under the
hard palate), ten words each, the exact pairs qadḥan / kadḥan, jāʾa / shāʾa, sujjirat / suyyirat
and the near pair qāla / kāna; heard as qāf or kāf, and jīm, shīn or yāʾ. Ḍād moved to the next
set, to be heard against dāl. The other 13 letters follow, set by set.)_

### F6 — Games _(Must)_

"Which rule?" (ten real words, then hear each), "Sort the 28" (drag every letter to its rule
against the clock), "Hold the ghunna" (hum with the beat: two counts, not one, not three).
**Acceptance:** each game drills one rule and feeds mistakes into spaced repetition.

### F7 — Recite and be heard twice _(Must)_

Record a word, āya or range; the app's first check (when switched on for that rule, ADR-0013)
marks words `good` / `check` with the rule; one tap sends it to the sheikh; he marks words and
can answer with his voice. Recordings stay private (ADR-0012). _(Built: record an āya from a
tapped word or an assignment's range, consent asked once, listen back, send to a chosen
ḥalaqa; takes recorded offline wait in the outbox and go when the device is online; "Deine
Rezitationen" on Today with the answer. Next: the first check, ADR-0013.)_ **Acceptance:**
recording and upload work offline-first; only teachers of the ḥalaqa can play it.

### T — Teacher and student _(Must)_

- **T1 Ḥalaqāt.** One-to-one or a circle; invite by link or QR code; the teacher approves.
- **T2 Assignments on the page** (ADR-0014): select āyāt or a word, pick _Lernen, Lesen,
  Nochmal rezitieren, Üben_ or a voice note, due date, reminder; "Von meinem Sheikh" comes
  first on Today; done goes back to him. _(Also by page of his printed muṣḥaf: "Seiten 8–9"
  of the 15-line IndoPak copy or the Madīna print, owner 2026-10-07.)_
- **T3 Listening queue.** Recordings waiting for him, the pre-check beside each; tap a word to
  mark it; reply by voice. _(Built: "Zum Abhören" on the ḥalaqa page, play, `good`/`again`, a
  quick remark (sīn, zāy and rāʾ among them) and his own words. Next: marks on words, voice
  replies, the pre-check.)_
- **T4 The ʿarḍ log.** Which sūras each student recited, when, and his verdict: the notebook of
  the chain, kept for him.
- **T5 Rule by rule.** Who still struggles with which rule.
- **T6 In the student's language** (ADR-0020). The sheikh writes or speaks in his language;
  each student reads in theirs. Quick remarks are exact translations from the catalogs;
  written remarks are machine-translated with tajwīd terms and āyāt unchanged, labelled
  "maschinell übersetzt", the original one tap away; voice notes stay his voice, with a
  transcript and its translation underneath. _(Built: quick remarks, the preview of written
  remarks for teachers, the translation service, quick remarks delivered with T3. Next: written
  remarks translated on delivery.)_
  **Acceptance:** the sheikh can assign and review entirely on a phone; a student never sees
  another student's recordings; a student reading German, French or Arabic understands a
  remark written in English, and can always see the original.

### L — Languages _(Must, built, ADR-0020)_

German (default), English, French and Arabic for the interface and the sign-in mail; Arabic
runs right to left. The language is chosen on the sign-in page or the account page and stored
on the account. **Acceptance:** every message exists in all four catalogs (typecheck and
test); switching to Arabic mirrors the layout; the first mail arrives in the language chosen on
the sign-in page.

### F8 — Live lessons _(Could, ADR-0015)_ and F9 — teacher-confirmed AI flags _(Should, ADR-0016)_

As described in their ADRs; only confirmed flags reach the student.

### F10 — Apps for iOS and Android _(Could, ADR-0019)_

## 6. Non-functional requirements

- **Offline-first:** units, muṣḥaf pages of downloaded packs, games and recording work offline.
- **Languages:** interface in German (default and source text, the sheet is German),
  English, French and Arabic (RTL) (ADR-0020); Qurʾān text always right to left with full
  tashkīl; repository content in English.
- **Accessibility:** WCAG 2.2 AA; touch targets ≥ 44 px; colour never the only signal; reduced
  motion respected; adjustable Qurʾān text size.
- **Privacy:** recordings never leave our servers; no tracking; GDPR export and deletion.
- **Security:** threat model in `docs/security/threat-model.md`; auth hardening from Suffa's
  review; secrets only in environment variables.
- **Performance:** first load ≤ 2.5 s on a mid-range phone on 4G; muṣḥaf page turn ≤ 100 ms
  from a downloaded pack.
- **Self-hostable:** CapRover, Postgres, RustFS; no third-party cloud for user data.

## 7. Plan (summary; details in `docs/plan/`)

| When                  | Milestone                                                                     |
| --------------------- | ----------------------------------------------------------------------------- |
| Sep 28 – Oct 4 (done) | Foundation; unit 2 from the sheet with its games; ḥalaqāt; the sheikh assigns |
| Oct 5 – Oct 18        | IndoPak muṣḥaf: coloured pages, tap for the rule, reciter word by word        |
| Oct 19 – Nov 1        | Recording, his listening queue and voice notes; letter lab; units 1, 3, 4     |
| Nov 2 – Nov 29        | Pilot ḥalaqa; the speech check measured against the sheikh                    |
| Then                  | Live lessons, AI flags he confirms, madd to waqf, Madīna muṣḥaf, Warsh        |

Dates depend on the portfolio capacity decision in the roadmap.
Each step ships to staging and is usable on its own.

## 8. Questions for the sheikh (they decide the first content pack)

1. **Iqlāb:** we teach it with ghunna, as the sheet does. Does he confirm?
2. **His muṣḥaf:** which IndoPak edition, 13, 15 or 16 lines? _Answered 2026-10-04: 15 lines,
   the edition with Urdu word meanings (al-Bayān fī maʿānī kalimāt al-Qurʾān al-Karīm bil-lugha
   al-Urdiyya); ADR-0017 update._
3. **Reference voice:** which reciter should students imitate?
4. **His lessons:** one-to-one or a ḥalqa, how often live, and will he review the rule texts
   (or record short examples himself)?
5. **The name:** is ʿArḍa right for this?
