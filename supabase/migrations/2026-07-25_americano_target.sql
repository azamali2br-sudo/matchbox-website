-- ============================================================
-- Americano: matches-per-player target (the tournament's finish line)
-- Run in Supabase SQL Editor (project ref: ilremifudktcbwkmtmbg).
--
-- SAFE: purely additive, nullable. NULL = open-ended tournament
-- (pre-target behavior). When set, the engine seats the most-behind
-- players first, shrinks the final round to fit, gives spare seats
-- to the lowest-standing players, and the organizer page announces
-- the finish instead of relying on manual round counting.
-- ============================================================

alter table americano_tournaments
  add column if not exists target_matches int;

-- ============================================================
-- Verify after running:
--   select column_name from information_schema.columns
--   where table_name = 'americano_tournaments' and column_name = 'target_matches';
-- ============================================================
