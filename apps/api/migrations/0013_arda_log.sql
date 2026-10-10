-- The ʿarḍ log (spec T4, S4.3; ADR-0025): which sūras each student recited to the sheikh, on
-- which day, and his verdict. Answering a recording writes its entry (one per recording, written
-- again when he answers again); what is recited face to face he writes by hand.
--
-- An entry outlives its recording (ADR-0012: the verdict and marks stay as text), but not the
-- student's membership: leaving the ḥalaqa, being removed or deleting the account deletes the
-- student's entries, deleting the ḥalaqa deletes its log. A teacher deleting their account
-- leaves the entries they wrote, without their name.

create table if not exists arda_log (
  id           uuid primary key default gen_random_uuid(),
  halaqa_id    uuid not null references halaqat (id) on delete cascade,
  student_id   uuid not null,
  sura         smallint not null check (sura between 1 and 114),
  aya_from     smallint not null check (aya_from >= 1),
  aya_to       smallint not null,
  recited_on   date not null,
  verdict      text not null check (verdict in ('good', 'again')),
  remark       text check (remark ~ '^[a-zA-Z]{1,40}$'),
  note         text check (char_length(note) between 1 and 1000),
  -- Marked words, [{ "aya": 2, "word": 3 }, …], in reading order (from the recording's answer).
  marks        jsonb not null default '[]' check (jsonb_typeof(marks) = 'array'),
  source       text not null check (source in ('recording', 'in_person')),
  recording_id uuid unique references recordings (id) on delete set null,
  written_by   uuid references users (id) on delete set null,
  created_at   timestamptz not null default now(),
  foreign key (halaqa_id, student_id)
    references halaqa_members (halaqa_id, user_id) on delete cascade,
  check (aya_to >= aya_from),
  check (source = 'recording' or recording_id is null)
);
-- The ḥalaqa's log, newest first; and per student, newest first.
create index if not exists arda_log_halaqa_idx
  on arda_log (halaqa_id, recited_on desc, created_at desc, id desc);
create index if not exists arda_log_student_idx
  on arda_log (halaqa_id, student_id, recited_on desc, created_at desc, id desc);
-- A student's own log across their ḥalaqāt.
create index if not exists arda_log_own_idx on arda_log (student_id, sura);
create index if not exists arda_log_written_by_idx
  on arda_log (written_by) where written_by is not null;
