# Sprint plan

- Status: v2 · 2026-10-03 · One-week sprints starting Mondays; every story has acceptance
  criteria and ends on staging. Stories reference spec 01. Phases, dates, gates and what the
  plan waits on: [`roadmap.md`](roadmap.md).

## S0 · Foundation (done 2026-10-03)

| Story                                             | Acceptance                                                                                                                                                                                | Status                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| S0.1 Monorepo from Suffa's skeleton               | `npm ci`, lint, format, typecheck, tests green                                                                                                                                            | done                                              |
| S0.2 Specs, ADRs, threat model, plan              | docs index lists all; ADR per hard-to-reverse decision                                                                                                                                    | done                                              |
| S0.3 Auth ported (A1–A5)                          | 115 api tests incl. Suffa's Postgres suite green                                                                                                                                          | done                                              |
| S0.4 CapRover deployment and CI                   | images build and pass smoke tests; release deploys digests to staging                                                                                                                     | done (staging secrets pending)                    |
| S0.5 Design system and shell                      | tokens, fonts, navigation; sign-in end to end in a browser                                                                                                                                | done                                              |
| S0.6 Languages and teacher translation (ADR-0020) | de, en, fr, ar (RTL); mail in the chosen language; quick remarks in every catalog; written remarks translated with terms kept, cached, limited; checked in a browser in French and Arabic | done (translation needs `ARDA_ANTHROPIC_API_KEY`) |

## S1 · Sheet and inbox (Sep 28 – Oct 4)

| Story                                                 | Acceptance                                                                                        | Status                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| S1.1 Staging live                                     | `arda-stg.siralabs.org/healthz` reports the deployed tag and `auth: enabled`; the sheikh signs in | done: api and web live, auth enabled                                                       |
| S1.2 `packages/tajweed`: taxonomy and letter classes  | 6 + 6 + 1 + 15 = 28 test; the four iẓhār exceptions; all sheet fixtures (spec 03 §4)              | done (also reads ʿUthmānī spelling; qalqala, mushaddad)                                    |
| S1.3 Unit 2 rule cards (iẓhār, idghām, iqlāb, ikhfāʾ) | texts from the sheet, marked draft; examples render in IndoPak with labels                        | done: 4 cards, examples coloured by the engine; audio and Ask al-Muʿallim follow           |
| S1.4 Games: Which rule?, Sort the 28                  | mistakes become review cards; works offline                                                       | done: both games, review session, Leitner deck on the device (ADR-0021); checked offline   |
| S1.5 T1 Ḥalaqāt and invites                           | link and QR; teacher approves; route × role matrix extended                                       | done: ḥalaqāt, invite link and QR, approval; routes × roles tested; checked in a browser   |
| S1.6 T2 Assignments (range by sūra/āya at first)      | due date; first on Today; done returns to the teacher                                             | done: give by sūra/āya or rule, due day, first on Today, who is done; checked in a browser |

## S2–S3 · IndoPak muṣḥaf (Oct 5 – Oct 18)

| Story                                                            | Acceptance                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| S2.1 `tools/`: Tanzil + cpfair import → word keys and rule spans | reproducible, checksummed; attribution in the manifest |
| S2.2 IndoPak layer and alignment for Juzʾ ʿAmma                  | same word count per āya; reviewed differences file     |
| S2.3 Pack `indopak-hafs-juz30@1` and offline storage             | installs once; renders with no connection              |
| S2.4 Muṣḥaf screen with colours and tap-for-rule                 | every rule family labelled; tap opens the rule         |
| S3.1 Reciter player with word timings                            | highlight within 100 ms; 0.5×–1×; loop                 |
| S3.2 Assign on the page (word selection)                         | assignments point at word keys                         |

## S4–S5 · Recite to him (Oct 19 – Nov 1)

| Story                                         | Acceptance                                                         |
| --------------------------------------------- | ------------------------------------------------------------------ |
| S4.1 Recording and offline upload (F7)        | consent asked once; upload resumes after offline                   |
| S4.2 Listening queue, marks, voice notes (T3) | only the ḥalaqa's teachers can play a recording (integration test) |
| S4.3 ʿArḍ log (T4)                            | per student and sūra; included in the export                       |
| S5.1 Letter lab (F5) and units 1, 3, 4        | SVGs reviewed by the sheikh                                        |
| S5.2 Port Suffa's sync and engagement         | progress syncs across devices; XP and streaks                      |
| S5.3 Production server and pilot readiness    | own server, approval step; restore drill passed; gate G3 met       |

## S6–S9 · Pilot ḥalaqa (Nov 2 – Nov 29)

| Story                                                 | Acceptance                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| S6.1 Speech service `arda-speech` (ADR-0013)          | runs on its own host; hints reach only the sheikh's queue              |
| S6.2 Agreement report per rule                        | the sheikh's verdicts vs the check, per rule, from opted-in recordings |
| S6–S9 Weekly pilot, feedback triaged into the backlog | one ḥalaqa every week; issues triaged each Monday                      |

## Port log (Suffa ↔ ʿArḍa, ADR-0002)

| Date       | Change                                                                                        | From            | To                                                |
| ---------- | --------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------- |
| 2026-10-03 | Auth, account, admin, audit, TOTP, migrations, tests                                          | Suffa `3540971` | ʿArḍa S0.3                                        |
| 2026-10-03 | Pin `@better-auth/core` to the `better-auth` version (two copies break passkey errors)        | ʿArḍa           | Suffa (to check: its lockfile has one copy today) |
| 2026-10-03 | Sign-in mail in the person's language (`metadata.language`, stored language, Accept-Language) | ʿArḍa           | Suffa (its ADR-0021 plans languages)              |
