-- The rule of a marked word (spec T3, T5; ADR-0026 update 2026-10-10): when he marks a word, the
-- sheikh can say which rule it was about, so the mark counts in "rule by rule". Optional: a mark
-- without a rule stays a mark. The topics are the rule cards of the path, madd and the letters'
-- articulation (apps/api/src/rules/repository.ts).

alter table recording_marks
  add column if not exists topic text
  check (topic in ('izhar', 'idgham', 'iqlab', 'ikhfa', 'ghunna', 'ikhfa-shafawi',
                   'idgham-shafawi', 'izhar-shafawi', 'qalqala', 'madd', 'makhraj'));
