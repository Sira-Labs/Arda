-- Assignments on the page (S3.2, ADR-0014): an assignment may start and end at a word, not
-- only at an āya. `word_from` counts the words of āya `aya_from` from 1, `word_to` those of
-- āya `aya_to`; together with the sūra they are the word keys `hafs:sura:aya:n` (ADR-0007).
-- Both or neither; only with a range. 128 is the most words an āya has (al-Baqara 282).

alter table assignments
  add column if not exists word_from smallint check (word_from between 1 and 128),
  add column if not exists word_to smallint check (word_to between 1 and 128);

alter table assignments
  add constraint assignments_words_check check (
    (word_from is null and word_to is null)
    or (sura is not null and word_from is not null and word_to is not null
        and (aya_from < aya_to or word_from <= word_to))
  );
