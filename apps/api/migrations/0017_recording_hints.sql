-- The speech check's hints (spec T3, story S6.1; ADR-0013 update 2026-11-15): `arda-speech`
-- hears a recitation and says, per word and rule, `good` or `check`. A hint is never a verdict:
-- it is shown only to the teachers of the recording's ḥalaqa while they listen, and the
-- agreement with their marks is measured per rule before any rule reaches students.
--
-- * recording_checks: one row per recording the api has handed to the service: `pending` while
--   it is out (a lease: taken again when it is older than the lease), `done` with the model
--   that heard it, or `failed` with the reason and the attempts so far.
-- * recording_hints: what the service said, per word of the recited āyāt (counted as the
--   content packs count them, like recording_marks) and per topic (the marks' topics).
--
-- Both go with the recording (ADR-0012): the student deleting the take, leaving the ḥalaqa or
-- deleting the account deletes its hints.

create table if not exists recording_checks (
  recording_id uuid primary key references recordings (id) on delete cascade,
  status       text not null check (status in ('pending', 'done', 'failed')),
  attempts     smallint not null default 1 check (attempts between 1 and 100),
  model        text check (char_length(model) between 1 and 100),
  error        text check (char_length(error) between 1 and 200),
  updated_at   timestamptz not null default now(),
  check ((status = 'done') = (model is not null)),
  check (error is null or status = 'failed')
);
-- What waits for another try, oldest first.
create index if not exists recording_checks_open_idx
  on recording_checks (updated_at) where status <> 'done';

create table if not exists recording_hints (
  recording_id uuid not null references recordings (id) on delete cascade,
  aya          smallint not null check (aya between 1 and 286),
  word         smallint not null check (word between 1 and 200),
  topic        text not null
               check (topic in ('izhar', 'idgham', 'iqlab', 'ikhfa', 'ghunna', 'ikhfa-shafawi',
                                'idgham-shafawi', 'izhar-shafawi', 'qalqala', 'madd', 'makhraj')),
  verdict      text not null check (verdict in ('good', 'check')),
  primary key (recording_id, aya, word, topic)
);
