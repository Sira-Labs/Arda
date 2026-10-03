-- Users and sign-in (ADR-0004, ported from Suffa's migrations 0002–0008 and 0024).
--
-- * `users` is the one user table; Better Auth maps its camelCase fields onto these
--   snake_case columns (src/auth/betterAuth.ts). Ids are UUIDs.
-- * Sign-in is by magic link, a six-digit code in the same mail, or a passkey. Links and codes
--   are stored hashed in `verifications`; rate-limit counters live in `rate_limits`.
-- * `accounts` stays for later sign-in methods (e.g. OIDC for teachers); it holds no passwords.
-- * Admin actions need a second factor (TOTP, ADR-0005): the secret is sealed at rest,
--   `last_step` refuses a replayed code, failed attempts lock briefly.
-- * `audit_log` records every privileged change; append-only, details never hold secrets.

create table if not exists users (
  id             uuid primary key,
  email          text unique,
  email_verified boolean not null default false,
  name           text,
  image          text,
  role           text not null default 'student'
                 check (role in ('student', 'teacher', 'admin')),
  -- IANA time zone: decides where "today" ends for streaks and due dates.
  time_zone      text check (time_zone is null or length(time_zone) between 1 and 64),
  -- A disabled user has no working session (checked on every request).
  disabled_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
-- Admin user list: newest first, keyset pagination on (created_at, id).
create index if not exists users_created_idx on users (created_at desc, id desc);

create table if not exists sessions (
  id               text primary key,
  user_id          uuid not null references users (id) on delete cascade,
  token            text not null unique,
  expires_at       timestamptz not null,
  ip_address       text,
  user_agent       text,
  -- When this session last confirmed the second factor (admins).
  second_factor_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions (user_id);
-- "My devices": a user's sessions by activity.
create index if not exists sessions_user_activity_idx on sessions (user_id, updated_at desc);

create table if not exists accounts (
  id                       text primary key,
  user_id                  uuid not null references users (id) on delete cascade,
  account_id               text not null,
  provider_id              text not null,
  access_token             text,
  refresh_token            text,
  id_token                 text,
  access_token_expires_at  timestamptz,
  refresh_token_expires_at timestamptz,
  scope                    text,
  password                 text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists accounts_user_idx on accounts (user_id);

create table if not exists verifications (
  id          text primary key,
  identifier  text not null,
  value       text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists verifications_identifier_idx on verifications (identifier);

create table if not exists rate_limits (
  id            text primary key,
  key           text not null unique,
  count         integer not null,
  last_request  bigint not null
);

-- WebAuthn credentials of Better Auth's passkey plugin. The public key is no secret, but the
-- API never returns it: /api/v1/account/passkeys lists only names, providers and dates.
create table if not exists passkeys (
  id             text primary key,
  user_id        uuid not null references users (id) on delete cascade,
  name           text,
  public_key     text not null,
  credential_id  text not null unique,
  -- Signature counter; authenticators that do not count report 0.
  counter        bigint not null default 0,
  device_type    text not null,
  backed_up      boolean not null default false,
  transports     text,
  aaguid         text,
  created_at     timestamptz not null default now()
);
create index if not exists passkeys_user_idx on passkeys (user_id);

create table if not exists user_totp (
  user_id      uuid primary key references users (id) on delete cascade,
  secret_enc   text not null,
  enabled_at   timestamptz,
  last_step    bigint,
  failed_count integer not null default 0,
  locked_until timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists audit_log (
  id          bigserial primary key,
  actor_id    uuid references users (id) on delete set null,
  action      text not null,
  target_type text not null,
  target_id   text not null,
  details     jsonb not null default '{}'::jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log (created_at desc, id desc);
create index if not exists audit_log_target_idx on audit_log (target_type, target_id);
