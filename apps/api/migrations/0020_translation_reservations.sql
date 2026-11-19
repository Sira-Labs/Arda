-- A place held in a person's daily translation limit while the translator is asked (ADR-0020
-- update 2026-11-19). The limit used to be checked before the call and counted after it, so
-- requests in flight together could each pass the check. A reservation is taken under a
-- per-person lock and counts like a translation until it is either turned into one or given
-- back; one left behind by a crashed process stops counting after two minutes.

create table if not exists translation_reservations (
  id         bigserial primary key,
  user_id    uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists translation_reservations_user_idx
  on translation_reservations (user_id, created_at desc);
