# ʿArḍa (العَرْضة)

**Recite, be heard, be corrected. Tajwīd, learned the way it was always taught.**

ʿArḍa puts the rule, the sound and your teacher on the same āya: a rule card from your sheikh's
material, the rule coloured in your own muṣḥaf (IndoPak first), a reciter word by word, where
the sound comes from, and your recitation sent to your sheikh, who marks the word and answers
with his voice. It is the seventh Sira Labs project and Suffa's sister: self-hostable,
offline-first, open source.

## Why "ʿArḍa"?

Each Ramaḍān Jibrīl reviewed the whole Qurʾān with the Prophet ﷺ; in his last year twice,
_al-ʿarḍa al-akhīra_. _ʿArḍ_ is still how the Qurʾān is passed on: the student recites, the
teacher corrects. Everything in the app prepares that moment ([ADR-0001](docs/adr/0001-name-arda.md)).

## Status

Day 1 (2026-10-03): specs, ADRs and threat model; Suffa's sign-in ported with its tests; the
CapRover deployment and CI; the design system and app shell. Next: unit 2 from the sheikh's
sheet, ḥalaqāt and assignments ([roadmap](docs/plan/roadmap.md)).

## Architecture

```
Device (PWA, offline-first) ─▶ arda-web (Caddy) ─/api─▶ arda-api (Hono, Better Auth) ─▶ arda-db (Postgres 17)
                                                ─/media─▶ rustfs (recordings, content packs)
```

Details: [technical spec](docs/spec/02-technical-spec.md). All documents: [docs/](docs/README.md).

## Quick start

Requirements: Node 22, Postgres 17 (or 16 for local work).

```bash
npm ci
createdb arda                       # or any Postgres database you can reach
export ARDA_DATABASE_URL=postgres://localhost/arda
export ARDA_AUTH_SECRET=$(openssl rand -hex 32)
export ARDA_PUBLIC_URL=http://localhost:5173
npm run build -w @arda/api && npm start -w @arda/api    # migrates, serves :8000
npm run dev                                              # web on :5173, proxies /api
```

Without SMTP outside prod, the sign-in link and code are written to the api log
(`auth.magic_link_logged`). Copy `.env.example` for the full list of settings.

## Checks

```bash
npm run format:check && npm run lint && npm run typecheck && npm test
ARDA_TEST_DATABASE_URL=postgres://localhost/arda_test npm test -w @arda/api   # + Postgres suite (wipes the DB)
```

## Deploy on CapRover

One-click templates in `infra/caprover/one-click/` (`arda.yml`, `arda-backup.yml`); every push
to `main` is tested, scanned, published to GHCR and deployed to staging
(`arda-stg.siralabs.org`). Runbook: [docs/ops/caprover-deployment.md](docs/ops/caprover-deployment.md).

## Sign-in

The same as Suffa ([ADR-0004](docs/adr/0004-authentication-same-as-suffa.md)): no passwords; a
link and a six-digit code by mail, or a passkey. Admin actions need a second factor.

## Project structure

```
apps/api     sign-in, accounts, admin, health, migrations
apps/web     PWA shell, sign-in screens, design tokens, fonts
infra/       Dockerfiles, Caddyfile, CapRover templates, backup scripts
docs/        specs, ADRs, plan, ops, security
```

## Content and rights

Only clearly open material is bundled; everything else is streamed or linked with credit
([ADR-0009](docs/adr/0009-content-sources-and-licensing.md)). The muṣḥaf font DigitalKhatt
IndoPak (© Amine Anane, Tarteel Inc.) is under the SIL Open Font License, included next to it.

## Contributing

Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`); run the checks above
before committing; an ADR for every hard-to-reverse decision; repository content in English,
learner-facing text in German. No secrets in code: configuration comes from environment
variables only.

## Licence

Code: Apache License 2.0 ([LICENSE](LICENSE)). Own illustrations and texts: CC BY 4.0 unless
stated otherwise. Third-party content keeps its own licence.
