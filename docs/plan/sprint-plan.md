# Sprint plan

- Status: v1 · 2026-10-03 · One-week sprints; every story has acceptance criteria and ends on
  staging. Stories reference spec 01.

## S0 · Foundation (done 2026-10-03)

| Story                                             | Acceptance                                                                                                                                                                                | Status                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| S0.1 Monorepo from Suffa's skeleton               | `npm ci`, lint, format, typecheck, tests green                                                                                                                                            | done                                              |
| S0.2 Specs, ADRs, threat model, plan              | docs index lists all; ADR per hard-to-reverse decision                                                                                                                                    | done                                              |
| S0.3 Auth ported (A1–A5)                          | 115 api tests incl. Suffa's Postgres suite green                                                                                                                                          | done                                              |
| S0.4 CapRover deployment and CI                   | images build and pass smoke tests; release deploys digests to staging                                                                                                                     | done (staging secrets pending)                    |
| S0.5 Design system and shell                      | tokens, fonts, navigation; sign-in end to end in a browser                                                                                                                                | done                                              |
| S0.6 Languages and teacher translation (ADR-0020) | de, en, fr, ar (RTL); mail in the chosen language; quick remarks in every catalog; written remarks translated with terms kept, cached, limited; checked in a browser in French and Arabic | done (translation needs `ARDA_ANTHROPIC_API_KEY`) |

## S1 · Sheet and inbox

| Story                                                 | Acceptance                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| S1.1 Staging live                                     | `arda-stg.siralabs.org/healthz` reports the deployed tag and `auth: enabled`; the sheikh signs in |
| S1.2 `packages/tajweed`: taxonomy and letter classes  | 6 + 6 + 1 + 15 = 28 test; the four iẓhār exceptions; all sheet fixtures (spec 03 §4)              |
| S1.3 Unit 2 rule cards (iẓhār, idghām, iqlāb, ikhfāʾ) | texts from the sheet, marked draft; examples render in IndoPak with labels                        |
| S1.4 Games: Which rule?, Sort the 28                  | mistakes become review cards; works offline                                                       |
| S1.5 T1 Ḥalaqāt and invites                           | link and QR; teacher approves; route × role matrix extended                                       |
| S1.6 T2 Assignments (range by sūra/āya at first)      | due date; first on Today; done returns to the teacher                                             |

## S2–S3 · IndoPak muṣḥaf

| Story                                                            | Acceptance                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| S2.1 `tools/`: Tanzil + cpfair import → word keys and rule spans | reproducible, checksummed; attribution in the manifest |
| S2.2 IndoPak layer and alignment for Juzʾ ʿAmma                  | same word count per āya; reviewed differences file     |
| S2.3 Pack `indopak-hafs-juz30@1` and offline storage             | installs once; renders with no connection              |
| S2.4 Muṣḥaf screen with colours and tap-for-rule                 | every rule family labelled; tap opens the rule         |
| S3.1 Reciter player with word timings                            | highlight within 100 ms; 0.5×–1×; loop                 |
| S3.2 Assign on the page (word selection)                         | assignments point at word keys                         |

## S4 · Recite to him

| Story                                         | Acceptance                                                         |
| --------------------------------------------- | ------------------------------------------------------------------ |
| S4.1 Recording and offline upload (F7)        | consent asked once; upload resumes after offline                   |
| S4.2 Listening queue, marks, voice notes (T3) | only the ḥalaqa's teachers can play a recording (integration test) |
| S4.3 ʿArḍ log (T4)                            | per student and sūra; included in the export                       |
| S4.4 Letter lab (F5) and units 1, 3, 4        | SVGs reviewed by the sheikh                                        |
| S4.5 Port Suffa's sync and engagement         | progress syncs across devices; XP and streaks                      |

## Port log (Suffa ↔ ʿArḍa, ADR-0002)

| Date       | Change                                                                                        | From            | To                                                |
| ---------- | --------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------- |
| 2026-10-03 | Auth, account, admin, audit, TOTP, migrations, tests                                          | Suffa `3540971` | ʿArḍa S0.3                                        |
| 2026-10-03 | Pin `@better-auth/core` to the `better-auth` version (two copies break passkey errors)        | ʿArḍa           | Suffa (to check: its lockfile has one copy today) |
| 2026-10-03 | Sign-in mail in the person's language (`metadata.language`, stored language, Accept-Language) | ʿArḍa           | Suffa (its ADR-0021 plans languages)              |
