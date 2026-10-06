-- Recitations (spec F7, T3; ADR-0012): a student records āyāt and sends them to the teachers of
-- one of their ḥalaqāt; a teacher listens and answers with a verdict, a quick remark and/or a
-- written note.
--
-- * recordings: one take, sent to one ḥalaqa: what it recites (sūra and āyāt), the assignment
--   it answers (if any), its format, size and length, and the teacher's answer. The client's id
--   makes a retried upload from the outbox land only once.
-- * recording_audio: the sound itself, apart from the list so a list never reads it. Until the
--   private RustFS bucket `arda-recordings` exists, the bytes are kept here (ADR-0012 update
--   2026-10-06); moving them is a copy, the rows stay.
--
-- Both point at the student's membership: leaving the ḥalaqa, being removed or deleting the
-- account deletes the student's recordings, as ADR-0012 promises. Deleting the ḥalaqa deletes
-- everything in it.

create table if not exists recordings (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null,
  halaqa_id     uuid not null references halaqat (id) on delete cascade,
  student_id    uuid not null,
  assignment_id uuid references assignments (id) on delete set null,
  sura          smallint not null check (sura between 1 and 114),
  aya_from      smallint not null check (aya_from >= 1),
  aya_to        smallint not null,
  mime          text not null
                check (mime in ('audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav')),
  bytes         integer not null check (bytes between 1 and 6000000),
  duration_ms   integer not null check (duration_ms between 1 and 600000),
  created_at    timestamptz not null default now(),
  verdict       text check (verdict in ('good', 'again')),
  remark        text check (remark ~ '^[a-zA-Z]{1,40}$'),
  note          text check (char_length(note) between 1 and 1000),
  reviewed_by   uuid references users (id) on delete set null,
  reviewed_at   timestamptz,
  unique (student_id, client_id),
  foreign key (halaqa_id, student_id)
    references halaqa_members (halaqa_id, user_id) on delete cascade,
  check (aya_to >= aya_from),
  check ((verdict is null) = (reviewed_at is null)),
  check (verdict is not null or (remark is null and note is null))
);
-- The teacher's queue: what waits first, oldest first, then what was answered.
create index if not exists recordings_queue_idx
  on recordings (halaqa_id, (reviewed_at is not null), created_at, id);
-- A student's own recordings, newest first.
create index if not exists recordings_student_idx
  on recordings (student_id, created_at desc, id desc);
create index if not exists recordings_assignment_idx
  on recordings (assignment_id) where assignment_id is not null;
create index if not exists recordings_reviewed_by_idx
  on recordings (reviewed_by) where reviewed_by is not null;

create table if not exists recording_audio (
  recording_id uuid primary key references recordings (id) on delete cascade,
  data         bytea not null
);
