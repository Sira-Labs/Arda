# ADR-0003: Self-hosted on CapRover: api, web and Postgres; worker later

- Status: accepted
- Date: 2026-10-03

## Context

Sira Labs projects are self-hostable: CapRover, Postgres, S3-compatible storage (the shared
RustFS), no third-party cloud for user data. Recitations are personal recordings of a person's
voice reading the Qurʾān; they must stay on infrastructure we control (ADR-0012).

## Decision

CapRover apps, the same layout as Suffa:

| App           | Image                           | Exposure                                                                 |
| ------------- | ------------------------------- | ------------------------------------------------------------------------ |
| `arda-web`    | `ghcr.io/sira-labs/arda-web`    | public domain; Caddy serves the PWA, proxies `/api` and `/media`         |
| `arda-api`    | `ghcr.io/sira-labs/arda-api`    | internal; migrates on start, port 8000                                   |
| `arda-db`     | `postgres:17`                   | internal                                                                 |
| `arda-backup` | `ghcr.io/sira-labs/arda-backup` | internal; nightly verified `pg_dump` into RustFS                         |
| `rustfs`      | shared (Suffa, Tabayyun)        | internal; buckets `arda-recordings`, `arda-content` (ADR-0010, ADR-0012) |

- **Same origin.** Web and API share one origin through Caddy: no CORS, no third-party cookies
  (ADR-0004).
- **Worker later.** Background work (alignment of recordings to the text, the speech check,
  ADR-0013) runs as `arda-worker` from the same image with a role switch and a Postgres job
  queue (pg-boss, as Suffa's ADR-0020) once the first job exists. Nothing runs in the
  background today, so there is no worker app yet.
- **Speech model.** The speech check runs on its own internal service (`arda-speech`, ADR-0013),
  never in the api process, because it needs a GPU or several CPU cores.
- **Live lessons** add a LiveKit server when they ship (ADR-0015).

## Alternatives

Supabase or another hosted backend: rejected for the same reasons as in Suffa's ADR-0007, plus
the privacy of recitations.

## Consequences

We own upgrades, backups and restore drills (runbook `docs/ops/caprover-deployment.md`).
