-- 2026-09-22 — No double bookings, enforced by the database.
--
-- The API already checks for overlaps before inserting, but two requests
-- arriving at the same moment can both pass that check. This exclusion
-- constraint makes Postgres reject the second one (error 23P01), which the
-- API turns into "That slot has just been taken".
--
-- Run in the Supabase SQL Editor on project ilremifudktcbwkmtmbg.
-- Additive: no drops, no data changes. Safe to re-run.

-- 0. Pre-check: any existing overlapping live bookings would make step 3 fail.
--    Expect 0 rows. If any appear, cancel one of each pair in the admin
--    dashboard first, then re-run this file.
select a.ref, b.ref, a.court, a.date, a.start_time, a.end_time, b.start_time, b.end_time
from bookings a
join bookings b on b.court = a.court and b.id > a.id
where a.attendance <> 'cancelled' and b.attendance <> 'cancelled'
  and tsrange(a.date + a.start_time::time,
              a.date + a.start_time::time + make_interval(mins => round(a.duration_hours * 60)::int), '[)')
   && tsrange(b.date + b.start_time::time,
              b.date + b.start_time::time + make_interval(mins => round(b.duration_hours * 60)::int), '[)');

-- 1. btree_gist lets an exclusion constraint combine "=" on court with "&&" on a range.
create extension if not exists btree_gist;

-- 2. Absolute time span of each booking (handles slots that cross midnight,
--    e.g. 23:30 + 1h → ends 00:30 next day). Stored generated column, so it
--    stays correct on every insert/update without app involvement.
alter table bookings
  add column if not exists slot_span tsrange
  generated always as (
    tsrange(
      date + start_time::time,
      date + start_time::time + make_interval(mins => round(duration_hours * 60)::int),
      '[)'
    )
  ) stored;

-- 3. The constraint itself. Cancelled rows are exempt so a freed slot can be rebooked.
alter table bookings drop constraint if exists bookings_no_overlap;
alter table bookings
  add constraint bookings_no_overlap
  exclude using gist (court with =, slot_span with &&)
  where (attendance <> 'cancelled');

-- 4. Verify
select conname, contype from pg_constraint where conname = 'bookings_no_overlap';
