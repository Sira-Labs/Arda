-- Marks on words (spec T3, S4.2): while he listens, the teacher taps the words of a recitation
-- that need work, and the student sees them marked under his answer. A mark is a word of the
-- recited āyāt, counted as the content packs count them (the api checks it against
-- @arda/quran). Marks belong to the answer: written with it, replaced with it, and deleted
-- with the recording (ADR-0012: the student's recordings go with the membership or the account).

create table if not exists recording_marks (
  recording_id uuid not null references recordings (id) on delete cascade,
  aya          smallint not null check (aya between 1 and 286),
  word         smallint not null check (word between 1 and 200),
  primary key (recording_id, aya, word)
);
