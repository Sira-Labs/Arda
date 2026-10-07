-- Progress on the account (ADR-0022, sprint story S5.2): the review deck and the best times of
-- the timed games (ADR-0021), until now kept only in the browser of one device.
--
-- * review_cards: one card per person and question. The id comes from the content
--   (`which-rule:<text>`, `sort:<letter>`), so two devices merge by id; per card the later
--   `updated_at` wins. Times are epoch milliseconds, as the client's scheduling counts them.
-- * best_times: the best time per person and game, in milliseconds; the better one wins.
--
-- Both cascade with the account: deleting it deletes the progress (A5).

create table if not exists review_cards (
  user_id    uuid not null references users (id) on delete cascade,
  card_id    text not null check (char_length(card_id) between 1 and 300),
  kind       text not null check (kind ~ '^[a-z][a-z-]{0,39}$'),
  prompt     text not null check (char_length(prompt) between 1 and 200),
  answer     text not null check (answer ~ '^[a-z][a-z-]{0,39}$'),
  box        smallint not null check (box between 1 and 5),
  due        bigint not null check (due >= 0),
  lapses     integer not null check (lapses >= 0),
  updated_at bigint not null check (updated_at >= 0),
  primary key (user_id, card_id)
);

create table if not exists best_times (
  user_id uuid not null references users (id) on delete cascade,
  game    text not null check (game ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  ms      integer not null check (ms > 0),
  primary key (user_id, game)
);
