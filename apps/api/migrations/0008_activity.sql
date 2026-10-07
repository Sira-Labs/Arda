-- The activity log (ADR-0023, sprint story S5.2): one row per finished round and per rule card
-- read to its end, from which the app computes XP, levels and the streak. Rows are only ever
-- added. `id` is the device's uuid, stored once per person however often it is sent; `seq` is
-- the server's order, so a device asks only for what it has not seen. Times are epoch
-- milliseconds, as the app counts them. Deleting the account deletes the log (A5).

create table if not exists activity_events (
  user_id     uuid not null references users (id) on delete cascade,
  id          uuid not null,
  seq         bigserial not null,
  kind        text not null check (kind ~ '^[a-z][a-z0-9-]{0,39}$'),
  ref         text not null check (ref ~ '^[a-z0-9-]{0,40}$'),
  at          bigint not null check (at >= 0),
  right_count smallint not null check (right_count >= 0),
  total       smallint not null check (total between 0 and 100),
  check (right_count <= total),
  primary key (user_id, id)
);
-- What a device has not seen yet: the person's events after a sequence number.
create unique index if not exists activity_events_user_seq_idx
  on activity_events (user_id, seq);
