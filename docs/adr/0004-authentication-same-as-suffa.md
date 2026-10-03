# ADR-0004: Authentication: Suffa's sign-in, ported (Better Auth, link + code + passkeys)

- Status: accepted
- Date: 2026-10-03
- Source: Suffa ADR-0008 with its updates of 2026-09-24, -25 and -26, and Suffa's security
  review `docs/security/2026-09-review-auth-sync.md` (all seven findings fixed there and
  carried over here)

## Context

The product owner asked for "the same auth as Suffa". Students and sheikhs are often on
phones, many are not technical, and some teachers are older: no passwords to forget, no
second app to install for students.

## Decision

Port Suffa's implementation (code, migration and tests) to `apps/api`:

- **Better Auth 1.7.6** inside the Hono API at `/api/v1/auth/*`, on our Postgres, mapped onto
  snake_case tables (`users`, `sessions`, `accounts`, `verifications`, `rate_limits`,
  `passkeys`); user ids are UUIDs. `@better-auth/core` is pinned with an npm `overrides` entry
  so the passkey plugin and Better Auth share one copy (two copies turn the plugin's 400s into
  500s; found while porting).
- **Ways in, no passwords:**
  1. **Magic link** by mail, valid 15 minutes, once, stored hashed.
  2. A **six-digit code** in the same mail, for mail apps that open links in their own browser;
     same 15 minutes, hashed, 5 wrong guesses, replaced by each new mail.
  3. Optional **passkeys** (Face ID, Touch ID, device PIN), added on the account page with a
     fresh session; discoverable credentials, user verification required; the relying party
     is the host of `ARDA_PUBLIC_URL`, never taken from the request.
- **Sessions:** database sessions read on every request (no cookie cache), httpOnly, `Secure`,
  `SameSite=Lax` cookies with prefix `arda`, 30 days, refreshed daily. The web and the API are
  same-origin. No tokens in `localStorage`. The native app (ADR-0019) uses Better Auth's
  bearer mode with **signed** tokens only, from the origins in `ARDA_APP_ORIGINS`.
- **Small surface:** only `POST /sign-in/magic-link`, `GET /magic-link/verify`,
  `POST /sign-in/email-otp`, the four passkey ceremony endpoints and `POST /sign-out` are
  reachable; every other Better Auth endpoint answers 404. Devices, passkeys, 2FA, export and
  deletion go through `/api/v1/account`, which never returns a session token or key material.
- **Guards:** every `callbackURL`, `errorCallbackURL` and `newUserCallbackURL` must be a path
  inside the app (400 otherwise); state-changing `/api/*` requests a browser marks as
  cross-site are refused (403); sign-in answers to the browser carry `{ ok: true }` only.
- **Rate limits** (database storage), keyed on `X-Real-IP`, which Caddy always overwrites:
  5 sign-in mails / 10 min, 10 link openings / min, 10 codes / 10 min, passkey sign-in 20 and
  10 / min, adding a passkey 5 / 10 min, 60 / min elsewhere.
- **Mail:** SMTP through the Google Workspace relay (`smtp-relay.gmail.com`), STARTTLS
  enforced on ports other than 465, short timeouts. German text, ʿArḍa's colours. Without SMTP
  in prod the api runs and logs `auth.disabled`; outside prod the link and code go to the log
  (or to files for browser tests, never in prod).
- **Admins:** a TOTP second factor (own RFC 6238 implementation, secret sealed with
  AES-256-GCM under a key derived from `ARDA_AUTH_SECRET`, replay refused, lock after five
  wrong codes) is required for every admin action and counts 12 hours per session.
- **Configuration** refuses to start in prod with a missing, short or placeholder
  `ARDA_AUTH_SECRET`, a database URL without a generated password, or no `ARDA_PUBLIC_URL`.

## Alternatives

As in Suffa: Keycloak/Authentik/Zitadel (heavy for one app; no built-in magic link), Auth.js,
Lucia (deprecated), Supabase Auth. **Single sign-on with Suffa** is attractive (the same sheikh
may teach in both) but needs a shared IdP; it stays an option (OIDC via Better Auth's generic
OAuth) without changing student sign-in.

## Consequences

- Moving the app to another domain invalidates passkeys; learners then use link or code and
  add a new passkey. Settle the domain (ADR-0001) before the pilot.
- Every fix to the auth code in Suffa is ported here in the same week (ADR-0002).
- Acceptance: `apps/api/test/auth.pg.integration.test.ts` (ported from Suffa) must stay green
  against Postgres in CI.
