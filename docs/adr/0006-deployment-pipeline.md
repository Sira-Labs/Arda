# ADR-0006: Deployment pipeline: tested images, digests, staging first

- Status: accepted
- Date: 2026-10-03
- Source: Suffa ADR-0013 and ADR-0024 (separate production server)

## Context

The sheikh and his students will use staging from week 1 (spec 01 §7). A deploy must never put
an untested image in front of them, and production must run exactly what staging ran.

## Decision

- **CI** (`.github/workflows/ci.yml`) on every pull request and push: format, lint,
  typecheck, unit tests, Postgres 17 integration tests, builds.
- **Release** (`.github/workflows/release.yml`) on every push to `main`:
  1. builds `arda-web`, `arda-api` and `arda-backup` once,
  2. smoke-tests each image in a real container (health and version, sign-in on and off,
     refusal of weak secrets, no test tooling in the image, backup and refused restore),
  3. scans it with Trivy (critical and fixable stops the release; exceptions with reason and
     date in `.trivyignore`),
  4. publishes exactly that image to GHCR as `sha-<7>` and `latest`,
  5. deploys the **digests** to the staging apps on CapRover in order (api first: it migrates),
  6. waits until `/healthz` and `/healthz-web` on staging report the new tag.
- **Staging** is `https://arda-stg.siralabs.org` on the current CapRover server, set in the
  GitHub environment `staging` (`CAPROVER_SERVER`, `CAPROVER_APP_TOKEN_API|WEB|BACKUP`).
  Without those settings the deploy is skipped with a notice; half-configured fails.
- **Production** comes with the pilot: a separate server, the same app names, a GitHub
  environment `production` with the owner as required reviewer, promoting the digests staging
  runs, and a rollback workflow (Suffa's `deploy-production.yml` and
  `rollback-production.yml`).
- **Migrations** run in the api on start under a Postgres advisory lock; the health check
  answers 503 `degraded` while the schema lags behind the image.

## Consequences

The `main` branch is always deployable; work happens on branches with pull requests.
