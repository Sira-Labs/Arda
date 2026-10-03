# ADR-0020: Languages: German, English, French and Arabic; the teacher's words in the student's language

- Status: accepted
- Date: 2026-10-03
- Related: ADR-0004 (sign-in mails), ADR-0005 (roles), ADR-0012 (recordings), ADR-0014
  (assignments), ADR-0016 (AI flags), ADR-0018 (design); Suffa ADR-0021 (learner languages)

## Context

The product owner asked for French and English next to German, and for a sheikh who speaks
English (or Arabic) to reach a student who reads German or Arabic. A ḥalqa often mixes
languages: the teacher teaches in one, each student reads the app in another. Tajwīd terms
(ghunna, ikhfāʾ, iqlāb, …) and every quotation of the Qurʾān must never be "translated".

## Decision

### 1. One language per person

- Each user has a **language**: `de` (default), `en`, `fr` or `ar` (`users.language`,
  migration 0002). It decides the app's interface, the sign-in mail, and the language the
  teacher's words reach them in. For a teacher it is also the language he writes in.
- Before signing in, the browser's choice (picker on the sign-in page, else
  `navigator.languages`, else German) is kept locally and sent with the sign-in request as
  `metadata.language`, so the first mail already arrives in it; after signing in, the stored
  profile wins and the picker saves it to the account.

### 2. The interface: typed catalogs, Arabic right to left

- `apps/web/src/i18n/`: one catalog per language, typed against the German one, so a missing
  or misspelled message fails the typecheck; parameters are functions
  (`greeting(name)`), never string templates assembled at runtime. No i18n library.
- **Arabic** switches the whole document to `dir="rtl"`; layout uses logical CSS properties
  (`padding-inline-start`, not `padding-left`) so it mirrors; Latin UI text uses Manrope,
  Arabic UI text IBM Plex Sans Arabic (OFL, bundled). Qurʾān text is unaffected (always the
  muṣḥaf fonts, always RTL).
- **Terms stay terms.** Rule names keep their transliteration in Latin-script languages
  (Ghunna, Ikhfāʾ) and their Arabic name in the Arabic UI (غُنَّة، إخفاء). Glosses
  ("nasal sound, 2 counts") are translated.

### 3. The teacher's words, in three tiers

1. **Quick remarks** ("ghunna too short", "nūn too clear", "good") are fixed ids with
   translations in every catalog. A mark stores the id; each student reads it in their own
   language. No machine translation, no cost, no delay. This covers most marks.
2. **Written remarks** (free text) are translated by the api when they reach a student whose
   language differs: Claude (`claude-opus-5-5`, effort `low`, server-side refusal fallback
   `"default"`) through the official Anthropic SDK, with a fixed instruction: translate only;
   keep tajwīd terms, Qurʾān quotations and sūra/āya references unchanged; never answer,
   add or soften. The student sees the translation with a "maschinell übersetzt" label and
   the original one tap away; the teacher sees what the student will read before sending.
   Translations are cached per (text, target language) in `translations`, so a remark the
   teacher uses often is translated once.
3. **Voice notes** keep the teacher's own voice as the primary content. A transcript and its
   translation are shown under it as a help; transcription runs on an EU provider or a
   self-hosted model as for Suffa's recordings (ADR-0012), added with the listening queue (T3).

### 4. Privacy and limits

- Only the remark text is sent for translation: no student name, no audio, no ids. The
  student's recording never leaves our servers (ADR-0012). Anthropic acts as a processor
  outside the EU; this is stated on the "Quellen und Datenschutz" page, and translation is off
  unless `ARDA_ANTHROPIC_API_KEY` is set.
- Only teachers and admins can request a translation (`feedback:translate`); remarks are at
  most 1000 characters; each teacher has a daily limit (`ARDA_TRANSLATE_DAILY_LIMIT`,
  default 200, counted in the database); cache hits do not count.
- A refusal or an API error never blocks the teacher: the remark is delivered in the original
  with "Übersetzung nicht verfügbar".

## Alternatives

- **i18next / react-intl:** mature, but a runtime dependency for four static catalogs; typed
  catalogs give compile-time completeness, which matters more here.
- **A machine-translation API (DeepL, Google):** good at general text, but they translate
  "ghunna" and Qurʾān words; an instructed model keeps the terms.
- **Translate everything up front in the teacher's language only:** students who do not read
  his language would lose the teacher, which is the point of the app.

## Consequences

- Every new learner-facing string is added to all four catalogs in the same change (the
  typecheck enforces it); German stays the source text for review by the sheikh.
- The sign-in mail exists in four languages.
- A machine translation is never presented as the teacher's own words.
