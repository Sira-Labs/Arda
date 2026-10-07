-- Assignments by page (ADR-0014 update 2026-10-07): "read pages 8–9" in the sheikh's printed
-- muṣḥaf. A page assignment keeps the layout and the pages as the teacher named them; the āyāt
-- on them come from @arda/quran (every page of both layouts starts with a new āya), so a run of
-- pages may cross sūras. The api checks the pages against the layout; the database keeps the
-- shape: all three or none, in order, and never together with a range of āyāt.

alter table assignments
  add column if not exists page_layout text check (page_layout in ('indopak-15', 'madina')),
  add column if not exists page_from smallint check (page_from between 1 and 1000),
  add column if not exists page_to smallint check (page_to between 1 and 1000);

alter table assignments
  add constraint assignments_pages_check check (
    (page_layout is null and page_from is null and page_to is null)
    or (page_layout is not null and page_from is not null and page_to is not null
        and page_from <= page_to and sura is null)
  );

-- Reading and reciting need what to read: āyāt (0004) or now pages. The check from 0004 has a
-- generated name, so it is found by what it says.
do $$
declare
  name text;
begin
  select conname into name
    from pg_constraint
   where conrelid = 'assignments'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) like '%''read''::text, ''recite''::text%'
     and pg_get_constraintdef(oid) like '%sura IS NOT NULL%';
  if name is not null then
    execute format('alter table assignments drop constraint %I', name);
  end if;
end $$;

alter table assignments
  add constraint assignments_reading_check check (
    kind not in ('read', 'recite') or sura is not null or page_layout is not null
  );
