-- The opt-in for measuring the speech check (story S6.2; ADR-0012, ADR-0013 update
-- 2026-11-16): a student may allow their recitations, the teacher's marks on them and the
-- check's hints to be counted in the agreement report per rule. Separate from the consent to
-- record, off until given and revocable: a row here is the opt-in, deleting it the opt-out.
-- The report is counted anew each time from who is opted in then, so taking the opt-in back
-- takes the student's recitations out of it at once. It goes with the account.

create table if not exists speech_evaluation_optins (
  user_id     uuid primary key references users (id) on delete cascade,
  opted_in_at timestamptz not null default now()
);
