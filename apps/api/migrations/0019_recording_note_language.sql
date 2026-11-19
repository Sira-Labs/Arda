-- The language a written remark was written in (spec T6, ADR-0020 update 2026-11-19): the
-- teacher's language when he answered, kept with the answer so a later change of his language
-- does not relabel what he wrote. Null without a written remark and for remarks written before
-- this migration: those are shown as written, never translated on a guess.

alter table recordings add column if not exists note_language text
  check (note_language is null or note_language in ('de', 'en', 'fr', 'ar'));
