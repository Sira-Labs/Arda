-- Languages and translated teacher remarks (ADR-0020).
--
-- * users.language: interface, sign-in mail and the language the teacher's words reach this
--   person in; for a teacher also the language he writes in. Null until chosen (= German).
-- * translations: machine translations of written remarks, cached per source text and target
--   language so a remark used often is translated once. created_by cascades with the account
--   and is part of the GDPR export; the daily limit counts rows per teacher.

alter table users add column if not exists language text
  check (language is null or language in ('de', 'en', 'fr', 'ar'));

create table if not exists translations (
  id              bigserial primary key,
  created_by      uuid not null references users (id) on delete cascade,
  source_hash     text not null,
  source_language text check (source_language is null or source_language in ('de', 'en', 'fr', 'ar')),
  target_language text not null check (target_language in ('de', 'en', 'fr', 'ar')),
  source_text     text not null,
  text            text not null,
  model           text not null,
  created_at      timestamptz not null default now(),
  unique (source_hash, target_language)
);
-- The daily limit per teacher: newest first per author.
create index if not exists translations_author_idx on translations (created_by, created_at desc);
