# Threat model

- Status: v1 · 2026-10-03 · Method: STRIDE per asset; reviewed with every feature that adds an
  asset or a route
- Related: ADR-0004 (auth), ADR-0005 (roles), ADR-0012 (recordings), Suffa's security review
  of 2026-09 (all findings carried over)

## Assets

| Asset                                                        | Why it matters                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| Accounts and sessions                                        | access to everything below                                    |
| Recitations (voice recordings, possibly of minors)           | personal data; must reach only the student's teachers         |
| The sheikh's marks, verdicts and the ʿarḍ log                | trust between teacher and student                             |
| Admin capabilities (roles, disabling users)                  | can make anyone a "teacher"                                   |
| Content packs                                                | a tampered pack could show wrong rules or altered Qurʾān text |
| Secrets (`ARDA_AUTH_SECRET`, DB and SMTP passwords, S3 keys) | everything else depends on them                               |

## Threats and controls

| #   | Threat (STRIDE)                                                | Control                                                                                                                       | Status                      |
| --- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| T1  | **Spoofing**: guessing a sign-in code                          | 6 digits, 5 guesses per code, 10 codes / 10 min per client, 15 min validity                                                   | built, tested               |
| T2  | Spoofing: stolen mailbox → account                             | links and codes once, 15 min; sessions listable and revocable; admins need TOTP                                               | built                       |
| T3  | Spoofing: rate limits bypassed with a forged `X-Forwarded-For` | client address only from `X-Real-IP`, always overwritten by Caddy (`trusted_proxies_strict`)                                  | built, tested               |
| T4  | **Tampering**: CSRF on state-changing routes                   | `SameSite=Lax`, same-origin guard on `/api/*` (Origin / Sec-Fetch-Site)                                                       | built, tested               |
| T5  | Tampering: open redirect after sign-in                         | every callback must be an in-app path (400 otherwise)                                                                         | built, tested               |
| T6  | Tampering: altered Qurʾān text or rules in a pack              | packs built reproducibly, checksummed manifest, verified before use; text stored verbatim from source                         | planned (packs)             |
| T7  | **Repudiation**: an admin denies a role change                 | append-only `audit_log` written in the same transaction                                                                       | built                       |
| T8  | **Information disclosure**: another student's recitation       | `halaqa:review` scope from the DB, presigned URLs short-lived and same-origin, private bucket                                 | planned (F7), policy tested |
| T9  | Disclosure: session tokens readable by scripts                 | httpOnly cookies; sign-in answers stripped to `{ ok: true }` for browsers; no tokens in storage                               | built, tested               |
| T10 | Disclosure: secrets in code or logs                            | env only; config refuses placeholders in prod; logs never contain links, codes or addresses on mail failures; DB URL redacted | built                       |
| T11 | Disclosure: recordings used for training                       | separate revocable opt-in; no third-party speech APIs                                                                         | planned (ADR-0013)          |
| T12 | **Denial of service**: mail flooding a victim                  | 5 sign-in mails / 10 min per client; SMTP timeouts so a blocked port fails fast                                               | built                       |
| T13 | DoS: large uploads                                             | size and duration limits per recording; uploads only for signed-in members of a ḥalaqa                                        | planned                     |
| T14 | **Elevation**: student acts as teacher                         | platform role checked before ḥalaqa scope; scoped actions without scope denied; route × role matrix test                      | built (policies)            |
| T15 | Elevation: stolen admin session                                | TOTP required per session (12 h), sealed secret, replay refused, lock after 5 wrong codes                                     | built, tested               |
| T16 | Supply chain: vulnerable image                                 | Trivy scan blocks critical fixable CVEs; no test tooling in the runtime image; pinned auth packages                           | built                       |
| T17 | XSS via content or user text                                   | React escaping; strict CSP (`script-src 'self'`, no inline scripts, fonts and media from self)                                | built                       |

| T18 | Disclosure: a teacher's remark sent to a translation provider | only the remark text (no names, ids or audio); off without a key; stated on the privacy page (ADR-0020) | built |
| T19 | Tampering: a remark tries to instruct the translation model ("ignore the rules…") | fixed instructions; the remark is wrapped as data; output shown as plain text (React escaping), never executed; the original is always shown alongside | built, tested |
| T20 | DoS / cost: translation abuse | teachers and admins only; 1000 characters; daily limit per teacher in the DB; cache | built, tested |

## Accepted risks

- A user with access to the student's unlocked phone can act as the student (as in any app).
- Reciter audio is streamed from third parties; its availability is outside our control.

## Review triggers

New route, new asset (recordings, live lessons, flags), new third party, new role.
