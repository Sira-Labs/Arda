# Documentation — ʿArḍa (العَرْضة)

| Document                                                                   | Purpose                                                                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [spec/01-product-spec.md](spec/01-product-spec.md)                         | Name, vision, roles, the learning loop, features with acceptance, NFRs, questions for the sheikh |
| [spec/02-technical-spec.md](spec/02-technical-spec.md)                     | Architecture, stack, data model, API, configuration                                              |
| [spec/03-content-and-tajweed-spec.md](spec/03-content-and-tajweed-spec.md) | Content packs, word keys, rule taxonomy and fixtures from the sheet                              |
| [spec/04-design-system.md](spec/04-design-system.md)                       | Principles, tokens, type, tajwīd colours, screens, components, voice                             |
| [security/threat-model.md](security/threat-model.md)                       | Assets, STRIDE threats and controls                                                              |
| [plan/roadmap.md](plan/roadmap.md)                                         | Phases, milestones, risks                                                                        |
| [plan/sprint-plan.md](plan/sprint-plan.md)                                 | Sprints with stories and acceptance; the Suffa port log                                          |
| [ops/caprover-deployment.md](ops/caprover-deployment.md)                   | CapRover setup, staging pipeline, backups, sign-in mails                                         |

## Architecture Decision Records

| ADR                                                              | Title                                                     | Status                   |
| ---------------------------------------------------------------- | --------------------------------------------------------- | ------------------------ |
| [0001](adr/0001-name-arda.md)                                    | The name ʿArḍa                                            | proposed                 |
| [0002](adr/0002-sibling-of-suffa-monorepo.md)                    | Separate repository from Suffa's skeleton                 | accepted                 |
| [0003](adr/0003-self-hosted-on-caprover.md)                      | Self-hosted on CapRover; worker later                     | accepted                 |
| [0004](adr/0004-authentication-same-as-suffa.md)                 | Authentication: Suffa's sign-in, ported                   | accepted                 |
| [0005](adr/0005-roles-and-halaqat.md)                            | Roles and ḥalaqāt                                         | accepted                 |
| [0006](adr/0006-deployment-pipeline.md)                          | Deployment pipeline: tested images, staging first         | accepted                 |
| [0007](adr/0007-quran-text-model.md)                             | Qurʾān text model: word keys, many scripts                | accepted                 |
| [0008](adr/0008-tajweed-engine.md)                               | Tajwīd engine, tested against the sheet                   | accepted                 |
| [0009](adr/0009-content-sources-and-licensing.md)                | Content sources and licensing                             | accepted, questions open |
| [0010](adr/0010-offline-first-content-packs.md)                  | Offline-first with content packs                          | accepted                 |
| [0011](adr/0011-reciter-audio.md)                                | Reciter audio, streamed with credit                       | proposed                 |
| [0012](adr/0012-recordings-and-privacy.md)                       | Recordings and privacy                                    | accepted                 |
| [0013](adr/0013-speech-check.md)                                 | Speech check, gated per rule                              | proposed                 |
| [0014](adr/0014-assignments-on-the-page.md)                      | Assignments on the muṣḥaf page                            | accepted (first cut)     |
| [0015](adr/0015-live-lessons.md)                                 | Live lessons on LiveKit                                   | proposed                 |
| [0016](adr/0016-teacher-confirmed-ai-flags.md)                   | AI flags the teacher confirms                             | proposed                 |
| [0017](adr/0017-mushaf-editions-and-riwayat.md)                  | Muṣḥaf editions and riwāyāt                               | accepted                 |
| [0018](adr/0018-design-system.md)                                | Design system                                             | accepted                 |
| [0019](adr/0019-mobile-apps.md)                                  | iOS and Android with Capacitor                            | proposed                 |
| [0020](adr/0020-languages-and-teacher-translation.md)            | Languages; the teacher's words in the student's language  | accepted                 |
| [0021](adr/0021-review-cards-leitner-local-first.md)             | Review cards: Leitner boxes, kept on the device first     | accepted                 |
| [0022](adr/0022-learning-without-account-progress-on-account.md) | Learning without an account; progress follows the account | accepted                 |
| [0023](adr/0023-xp-levels-and-streaks.md)                        | XP, levels and streaks from an activity log               | accepted                 |

New ADRs use the template of ADR-0002: title, status, date, Context, Decision, Alternatives,
Consequences; later changes are added as dated "Update" sections.
