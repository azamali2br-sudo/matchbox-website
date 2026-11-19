-- ============================================================
-- Remove the test data Claude created on 2026-11-19 during the
-- pre-launch test run. Run in the Supabase SQL Editor, project
-- MBX / ref ilremifudktcbwkmtmbg ONLY.
--
-- Everything is keyed on the test phone +923009990417 and the
-- exact ids below, so no real customer row can match.
-- Paste the whole file; the final SELECT should return all zeros.
-- ============================================================

begin;

-- Payments on the test bookings (MBX-20CLJ1, MBX-6RPSVX, MBX-ANDXX6,
-- MBX-ISKWJZ, MBX-LYKZMT, MBX-PXQKLJ — all on the test phone, all cancelled)
delete from payments
where booking_id in (select id from bookings where phone = '+923009990417');

-- Credit ledger rows for the test phone (rewards, reversals, refunds, redemptions)
delete from credits where phone = '+923009990417';

-- The test bookings
delete from bookings where phone = '+923009990417';

-- Test account (its magic-link tokens cascade)
delete from accounts
where id = 'fbeac128-cddc-4a36-bb3a-1d479bc62499' and phone = '+923009990417';

-- Test Americano "CLAUDE TEST - delete" (already hidden)
delete from americano_tournaments
where id = '167568d4-fcc4-44fe-88d1-5a3dbf676ab3' and name = 'CLAUDE TEST - delete';

commit;

select
  (select count(*) from accounts where phone = '+923009990417')                  as accounts_left,
  (select count(*) from bookings where phone = '+923009990417')                  as bookings_left,
  (select count(*) from credits  where phone = '+923009990417')                  as credits_left,
  (select count(*) from players  where phone = '+923009990417')                  as players_left,
  (select count(*) from americano_tournaments where name = 'CLAUDE TEST - delete') as americano_left;
