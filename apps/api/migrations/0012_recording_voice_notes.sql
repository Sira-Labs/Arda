-- Voice notes (spec T3, S4.2): the teacher answers a recitation with his own voice as well as
-- in writing, up to two minutes, and the student hears it under the answer. One note per
-- recording, replaced when he records it again. Like the recording's sound it is kept here until
-- the private RustFS bucket exists (ADR-0012 update 2026-10-06), served only to the student and
-- the ḥalaqa's teachers, never cached.
--
-- The note is the teacher's voice: it goes with the recording (the student deletes it, leaves
-- the ḥalaqa or deletes the account) and with the account of the teacher who recorded it.

create table if not exists recording_voice_notes (
  recording_id uuid primary key references recordings (id) on delete cascade,
  recorded_by  uuid not null references users (id) on delete cascade,
  mime         text not null
               check (mime in ('audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav')),
  bytes        integer not null check (bytes between 1 and 2500000),
  duration_ms  integer not null check (duration_ms between 1 and 120000),
  data         bytea not null,
  created_at   timestamptz not null default now()
);
-- Deleting a teacher's account finds their notes.
create index if not exists recording_voice_notes_recorded_by_idx
  on recording_voice_notes (recorded_by);
