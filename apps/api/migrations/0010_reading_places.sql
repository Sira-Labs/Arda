-- Where someone last read in the muṣḥaf (ADR-0022 update 2026-10-07): one page per script, as
-- that script prints its pages (IndoPak as the sheikh's copy numbers them, Madīna 1–604), so
-- "Weiterlesen" opens it on every device. The later `at` (epoch milliseconds) wins, like a
-- review card. It cascades with the account (A5).

create table if not exists reading_places (
  user_id uuid not null references users (id) on delete cascade,
  script  text not null check (script in ('indopak', 'uthmani')),
  page    smallint not null check (page between 1 and 1000),
  at      bigint not null check (at >= 0),
  primary key (user_id, script)
);
