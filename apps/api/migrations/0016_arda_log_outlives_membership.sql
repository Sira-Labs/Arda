-- The ʿarḍ log outlives the membership (owner, 2026-10-10; ADR-0025 update): a student leaving
-- the ḥalaqa or being removed no longer deletes their entries, as a paper notebook keeps them.
-- They still go with the student's account (A5) and with the ḥalaqa; the teachers see them under
-- former students, and "rule by rule" counts only active students.

alter table arda_log drop constraint if exists arda_log_halaqa_id_student_id_fkey;
alter table arda_log
  add constraint arda_log_student_id_fkey
  foreign key (student_id) references users (id) on delete cascade;
