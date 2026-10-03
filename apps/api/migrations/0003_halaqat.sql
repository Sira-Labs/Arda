-- Ḥalaqāt, their members and invites (ADR-0005, spec story T1).
--
-- * halaqat: a teacher's circle, or a one-to-one class (at most one student). Deleting the
--   teacher's account deletes the ḥalaqāt they opened, with their memberships and invites.
-- * halaqa_members: who belongs to a ḥalaqa and as what. A student who joins by invite is
--   `pending` until the teacher approves; only `active` members see the ḥalaqa (halaqa:read).
--   The teacher's own row is created with the ḥalaqa.
-- * halaqa_invites: Suffa's invite design. The link carries a 192-bit random token; only its
--   SHA-256 is stored, so a database leak does not leak working links. Valid 14 days; a new
--   link revokes the previous one.

create table if not exists halaqat (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  one_to_one  boolean not null default false,
  created_by  uuid not null references users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists halaqat_created_by_idx on halaqat (created_by);

create table if not exists halaqa_members (
  halaqa_id   uuid not null references halaqat (id) on delete cascade,
  user_id     uuid not null references users (id) on delete cascade,
  halaqa_role text not null check (halaqa_role in ('teacher', 'student')),
  status      text not null check (status in ('pending', 'active')),
  joined_at   timestamptz not null default now(),
  approved_at timestamptz,
  primary key (halaqa_id, user_id)
);
-- "My ḥalaqāt" for a person.
create index if not exists halaqa_members_user_idx on halaqa_members (user_id);

create table if not exists halaqa_invites (
  id          uuid primary key default gen_random_uuid(),
  halaqa_id   uuid not null references halaqat (id) on delete cascade,
  token_hash  text not null unique,
  created_by  uuid references users (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz
);
create index if not exists halaqa_invites_halaqa_idx on halaqa_invites (halaqa_id);
