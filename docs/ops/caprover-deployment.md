# Deploying ʿArḍa on CapRover (same pattern as Suffa)

ʿArḍa is deployed exactly like Suffa (ADR-0003, ADR-0006): images are built by GitHub Actions,
smoke-tested, scanned, published to GHCR and deployed to CapRover apps by digest with app
tokens. CapRover's nginx terminates TLS; `arda-web`'s Caddy serves the PWA and proxies `/api`
and `/media` over the internal network.

```
Internet ─▶ CapRover nginx (TLS) ─▶ arda-web (Caddy :80) ─/api───▶ arda-api (:8000) ─▶ arda-db (Postgres 17)
                                             └─/media─▶ rustfs (:9000, shared)
                                                            ▲
                                    arda-backup (nightly pg_dump) ─┘
```

## Servers

| Server                                                             | Apps                                             | Domain                  | Data                                               |
| ------------------------------------------------------------------ | ------------------------------------------------ | ----------------------- | -------------------------------------------------- |
| **Staging** (current CapRover host, with Suffa staging and RustFS) | `arda-web`, `arda-api`, `arda-db`, `arda-backup` | `arda-stg.siralabs.org` | the sheikh, the pilot students' test use           |
| **Production** (with the pilot, Suffa's production server)         | same names                                       | `arda.siralabs.org`     | real students; the only place for real recitations |

Production has its own secrets, RustFS keys, SMTP settings and app tokens; nothing is copied
from staging. Both servers: SSH by key only, firewall 80/443/22, CapRover dashboard with a
strong password and 2FA, unattended security updates.

## Quick start: one-click templates

In CapRover: **Apps → One-Click Apps/Databases → `>> TEMPLATE <<`**, paste the file, app name
**`arda`**, deploy.

| Template                                   | Creates                           | Notes                                                    |
| ------------------------------------------ | --------------------------------- | -------------------------------------------------------- |
| `infra/caprover/one-click/arda.yml`        | `arda-db`, `arda-api`, `arda-web` | generates the DB password and auth secret; asks for SMTP |
| `infra/caprover/one-click/arda-backup.yml` | `arda-backup`                     | nightly verified backups into RustFS                     |

Images: `ghcr.io/sira-labs/arda-web`, `arda-api`, `arda-backup`. New packages in a GitHub
organization start **private**: after the first release, open each package → Package settings
→ visibility **public** (or give CapRover registry credentials). Without GHCR, the root
`captain-definition` (web) and `infra/caprover/api/captain-definition` build on the server.

## 1. `arda-db`

- Image `postgres:17` (pin a minor version for production; upgrade deliberately after a dump).
- `POSTGRES_USER=arda`, `POSTGRES_DB=arda`, `POSTGRES_PASSWORD=<openssl rand -hex 24>`.
- Persistent directory `/var/lib/postgresql/data` (label `arda-pgdata`); no port mapping.
- Reached at `srv-captain--arda-db:5432`.

## 2. `arda-api`

| Variable                                             | Value                                                                                                                |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ARDA_ENV`                                           | `prod`                                                                                                               |
| `ARDA_PUBLIC_URL`                                    | `https://arda-stg.siralabs.org` (staging)                                                                            |
| `ARDA_DATABASE_URL`                                  | `postgres://arda:<pw>@srv-captain--arda-db:5432/arda`                                                                |
| `ARDA_AUTH_SECRET`                                   | `openssl rand -hex 48`; also in the owner's password manager                                                         |
| `ARDA_SMTP_HOST`, `ARDA_SMTP_PORT`, `ARDA_MAIL_FROM` | `smtp-relay.gmail.com`, `587`, `ʿArḍa <noreply@siralabs.org>`                                                        |
| `ARDA_SMTP_USER`, `ARDA_SMTP_PASSWORD`               | only with "Require SMTP Authentication"                                                                              |
| `ARDA_TRUSTED_ORIGINS`                               | optional: the old domain while moving                                                                                |
| `ARDA_ANTHROPIC_API_KEY`                             | optional: translates teachers' written remarks (ADR-0020); the log shows `translate.enabled` or `translate.disabled` |
| `ARDA_TRANSLATE_DAILY_LIMIT`                         | optional, default 200 per teacher and day                                                                            |

- Container HTTP port **8000**, not exposed as a web app.
- Starts by migrating the database (advisory lock), then logs `auth.enabled` with `mail: smtp`.
- Refuses to start (`config.invalid`) with a missing, short or placeholder secret, a database
  URL without a generated password, or no `ARDA_PUBLIC_URL`.

## 3. `arda-web`

| Variable              | Value                                     |
| --------------------- | ----------------------------------------- |
| `ARDA_API_UPSTREAM`   | `srv-captain--arda-api:8000` (two dashes) |
| `ARDA_MEDIA_UPSTREAM` | `srv-captain--rustfs:9000`                |

HTTP Settings: connect `arda-stg.siralabs.org`, **Enable HTTPS**, **Force HTTPS**. Container
HTTP port **80**. Check `https://arda-stg.siralabs.org/healthz` (api, through Caddy) and
`/healthz-web` (the web image's own version).

## 4. RustFS (shared `rustfs` app)

Buckets (created when recordings and packs ship): `arda-recordings` (private recitations,
ADR-0012), `arda-content` (content packs, ADR-0010), `arda` (backups, versioning and object
lock). Keys:

- `arda-app`: read/write/delete on `arda-recordings/*` and `arda-content/*`, list on both.
- `arda-backup`: put/get on `arda/postgres/*`, list on `arda`, **no delete** (a compromised
  host cannot wipe backups). Same policy shape as Suffa's runbook §8.1.

## 5. GitHub Actions: staging

Repository → Settings → Environments → **`staging`**:

| Kind     | Name                        | Value                                                                                 |
| -------- | --------------------------- | ------------------------------------------------------------------------------------- |
| variable | `CAPROVER_SERVER`           | `https://captain.<root-domain>`                                                       |
| variable | `ARDA_STAGING_URL`          | optional, default `https://arda-stg.siralabs.org`                                     |
| variable | `CAPROVER_APP_API`          | the api app's name when it is not `arda-api`                                          |
| variable | `CAPROVER_APP_WEB`          | the web app's name when it is not `arda-web`                                          |
| variable | `CAPROVER_APP_BACKUP`       | the backup app's name when not `arda-backup`                                          |
| secret   | `CAPROVER_APP_TOKEN_API`    | the app `CAPROVER_APP_API` names (default `arda-api`) → Deployment → Enable App Token |
| secret   | `CAPROVER_APP_TOKEN_WEB`    | the app `CAPROVER_APP_WEB` names (default `arda-web`) → Deployment → Enable App Token |
| secret   | `CAPROVER_APP_TOKEN_BACKUP` | optional: the app `CAPROVER_APP_BACKUP` names (default `arda-backup`), once it exists |

Every push to `main`: checks → images (smoke tests, Trivy) → GHCR → deploy api, backup, web by
digest → wait until staging reports the new `sha-…`. Without `CAPROVER_SERVER` and the tokens
the deploy is skipped with a notice.

## 6. Order of setup (first time)

1. Template `arda.yml` → app name `arda`.
2. `arda-web` → domain, HTTPS, Force HTTPS.
3. Workspace SMTP relay allows the server (§8); fill `ARDA_MAIL_FROM` on `arda-api`; restart.
4. `https://arda-stg.siralabs.org/healthz` → `"status":"ok"`, `"auth":"enabled"`.
5. Sign in with the owner's address; make the account admin once from the database:
   `update users set role = 'admin' where email = '<owner>';` then set up 2FA on the account
   page; make the sheikh a `teacher` in the admin area.
6. App tokens → GitHub environment `staging` (§5).
7. Backups (§7).

## 7. Backups (`arda-backup`)

Nightly `pg_dump` of `arda-db`, checked with `pg_restore --list`, uploaded to the RustFS
bucket `arda` (`postgres/daily/YYYY/MM/arda-<timestamp>.dump`, plus `postgres/monthly/` on the
1st), size verified after upload. Template `arda-backup.yml`; variables `ARDA_BACKUP_*`
(database URL, S3 endpoint, bucket, key, time, run on start, optional ping URL), the same as
Suffa's §8.

**Restore drill** (monthly, on the production server only, into a scratch database; the script
refuses the live database):

```bash
docker exec -it $(docker ps -q -f name=srv-captain--arda-db) psql -U arda -c 'create database restore_drill'
docker exec -it $(docker ps -q -f name=srv-captain--arda-backup) sh -c \
  'ARDA_RESTORE_DATABASE_URL=${ARDA_BACKUP_DATABASE_URL%/arda}/restore_drill /opt/arda-backup/restore.sh latest'
docker exec -it $(docker ps -q -f name=srv-captain--arda-db) psql -U arda -d restore_drill -c 'select count(*) from users'
docker exec -it $(docker ps -q -f name=srv-captain--arda-db) psql -U arda -c 'drop database restore_drill'
```

## 8. Sign-in mails

Same relay as Suffa and Tabayyun (admin.google.com → Apps → Google Workspace → Gmail → Routing
→ SMTP relay service): allowed senders "only addresses in my domains", the server's public IP
and/or SMTP authentication, TLS required. ʿArḍa greets the relay with the host of
`ARDA_PUBLIC_URL`. Port 587 with STARTTLS (465 is often blocked by hosts).

| Symptom                                               | Cause                                       | Fix                                                       |
| ----------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| `auth.disabled: SMTP is not configured`               | `ARDA_SMTP_HOST` / `ARDA_MAIL_FROM` missing | set both, restart                                         |
| `mail.send_failed` with `550 5.7.0 Mail relay denied` | relay rule does not match IP or auth        | add the server IP or SMTP auth to the rule                |
| `mail.send_failed` with `ETIMEDOUT` / `ESOCKET`       | outgoing port blocked                       | use 587                                                   |
| sign-in answers `403 INVALID_ORIGIN`                  | browser address ≠ `ARDA_PUBLIC_URL`         | fix it or list the other origin in `ARDA_TRUSTED_ORIGINS` |
| passkeys stop working after a domain move             | passkeys are bound to the host              | sign in with link or code, add a new passkey              |

## 9. Troubleshooting

| Symptom                                                                        | Cause                                                                                                                                                | Fix                                                                                                                    |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| api log `config.invalid`                                                       | placeholder or short secret, weak DB password, no public URL                                                                                         | generate secrets as above, **Save & Update**                                                                           |
| `/healthz` and `/api` answer 502, `/healthz-web` is fine                       | arda-api is not running (crash loop); before this fix, the one-click defaults (relay host, empty sender) stopped it                                  | check arda-api → App Logs; `config.feature_off` names an incomplete optional setting (the api still runs, sign-in off) |
| `/healthz` 503 `degraded`                                                      | schema behind the image (migration failed)                                                                                                           | api log `migrate.*`; never run two api versions against one DB                                                         |
| web log `lookup srv-captain--arda-api: no such host`                           | upstream name mismatch                                                                                                                               | `ARDA_API_UPSTREAM=srv-captain--<api app>:8000`                                                                        |
| deploy: `CapRover rejected the deployment (status 1106): Auth token corrupted` | the token belongs to another app than the one deployed to (an app named `arda-stg-api` while the workflow deploys `arda-api`), or it was regenerated | set `CAPROVER_APP_API`/`_WEB` to the app names in the `staging` environment; copy the current App Token again          |
| image pull `unauthorized`                                                      | GHCR package private                                                                                                                                 | make the package public (§ quick start)                                                                                |
