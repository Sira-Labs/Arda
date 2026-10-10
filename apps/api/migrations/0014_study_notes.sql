-- Mein Lernplan (owner, 2026-10-10; ADR-0022 update): a student's own notes on what to learn
-- ("two pages of al-Baqara"), what to revise and what was hard. Private: only the person reads
-- them, no teacher, no admin route. Kept on the device first and synced with the progress like
-- review cards: per note the later `updated_at` (epoch milliseconds) wins, and a deleted note
-- stays as a tombstone without its text, so an older device cannot bring it back. They cascade
-- with the account (A5) and are in the export (`progress.notes`).

create table if not exists study_notes (
  user_id     uuid not null references users (id) on delete cascade,
  id          uuid not null,
  kind        text not null check (kind in ('learn', 'review', 'difficulty')),
  text        text not null check (char_length(text) <= 500),
  -- Where in the muṣḥaf, if anywhere: āyāt of one sūra, or pages of a printed layout.
  sura        smallint check (sura between 1 and 114),
  aya_from    smallint check (aya_from >= 1),
  aya_to      smallint,
  page_layout text check (page_layout in ('indopak-15', 'madina')),
  page_from   smallint check (page_from >= 1),
  page_to     smallint,
  done        boolean not null default false,
  deleted     boolean not null default false,
  created_at  bigint not null check (created_at >= 0),
  updated_at  bigint not null check (updated_at >= 0),
  primary key (user_id, id),
  check ((sura is null) = (aya_from is null) and (sura is null) = (aya_to is null)),
  check (aya_to is null or aya_to >= aya_from),
  check ((page_layout is null) = (page_from is null)
         and (page_layout is null) = (page_to is null)),
  check (page_to is null or page_to >= page_from),
  check (sura is null or page_layout is null),
  check (deleted or char_length(text) >= 1),
  check (not deleted or (text = '' and sura is null and page_layout is null))
);
