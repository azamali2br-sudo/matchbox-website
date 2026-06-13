-- ============================================================
-- Match IQ — season freeze (snapshot table)
-- Run in Supabase SQL Editor (project ref: ilremifudktcbwkmtmbg).
--
-- SAFE: purely additive. Adds ONE table that stores the final,
-- frozen standings + badges for a finished month so a late-approved
-- match (or a future Elo tweak) can never silently rewrite a season
-- that already had a champion announced.
--
-- A row exists  -> that month is CLOSED (final). The leaderboard and
--                  trophy case read the stored snapshot, not a live replay.
-- No row        -> that month is OPEN and recomputes live as before.
-- ============================================================

create table if not exists match_iq_seasons (
  month       text primary key,          -- 'YYYY-MM' (Karachi calendar month)
  standings   jsonb not null,            -- frozen buildStandings() output: { mainDraw, qualifying, totalMatches, totalPlayers }
  closed_at   timestamptz not null default now(),
  closed_by   text default 'admin'
);

-- RLS: all reads/writes go through service-role API routes (same posture as
-- the accounts table). No public policy → locked by default once RLS is on.
alter table match_iq_seasons enable row level security;

-- ============================================================
-- Verify after running:
--   select month, closed_at, closed_by from match_iq_seasons order by month;
--   -- expect 0 rows immediately after migration (nothing closed yet)
-- ============================================================
