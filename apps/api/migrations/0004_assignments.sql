-- Assignments (spec T2, ADR-0014): the sheikh gives work, the student marks it done.
--
-- * assignments: for one student of a ḥalaqa, or for all its students (student_id null).
--   A kind (learn, read, recite, practise), a range of āyāt in one sūra (word keys follow
--   with the content packs), an optional focus rule, a due day and a note. Read and recite
--   need a range; learn and practise need a rule. The api checks the range against the
--   muṣḥaf (@arda/quran) and the rule against @arda/tajweed; the database keeps the shape.
-- * assignment_completions: who marked what done, and when; this is what returns to the
--   teacher.
--
-- Both tables point at the student's membership: when a student leaves, is removed or deletes
-- the account, their own assignments and their completions go with it. Deleting the ḥalaqa
-- deletes everything in it.

create table if not exists assignments (
  id           uuid primary key default gen_random_uuid(),
  halaqa_id    uuid not null references halaqat (id) on delete cascade,
  student_id   uuid,
  kind         text not null check (kind in ('learn', 'read', 'recite', 'practise')),
  sura         smallint,
  aya_from     smallint,
  aya_to       smallint,
  focus_rule   text check (focus_rule ~ '^[a-z][a-z-]{0,39}$'),
  repetitions  smallint check (repetitions between 1 and 20),
  note         text check (char_length(note) between 1 and 500),
  due_on       date not null,
  created_by   uuid references users (id) on delete set null,
  created_at   timestamptz not null default now(),
  foreign key (halaqa_id, student_id)
    references halaqa_members (halaqa_id, user_id) on delete cascade,
  check (
    (sura is null and aya_from is null and aya_to is null)
    or (sura between 1 and 114 and aya_from >= 1 and aya_to >= aya_from)
  ),
  check (kind not in ('read', 'recite') or sura is not null),
  check (kind not in ('learn', 'practise') or focus_rule is not null),
  check (repetitions is null or kind = 'read')
);
-- The ḥalaqa's list, newest due day first (read backwards for "next due").
create index if not exists assignments_halaqa_idx
  on assignments (halaqa_id, due_on, created_at, id);
-- One student's own assignments (and the cascade when their membership ends).
create index if not exists assignments_student_idx
  on assignments (halaqa_id, student_id) where student_id is not null;
create index if not exists assignments_created_by_idx on assignments (created_by);

create table if not exists assignment_completions (
  assignment_id uuid not null references assignments (id) on delete cascade,
  halaqa_id     uuid not null,
  student_id    uuid not null,
  done_at       timestamptz not null default now(),
  primary key (assignment_id, student_id),
  foreign key (halaqa_id, student_id)
    references halaqa_members (halaqa_id, user_id) on delete cascade
);
create index if not exists assignment_completions_member_idx
  on assignment_completions (halaqa_id, student_id);
