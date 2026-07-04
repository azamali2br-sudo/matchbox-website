-- ============================================================
-- Americano tournaments — open community tool
-- Run in Supabase SQL Editor (project ref: ilremifudktcbwkmtmbg).
--
-- SAFE: purely additive. One self-contained table — a tournament's
-- players and rounds live in jsonb on the row (no joins, no accounts,
-- fully independent of Match IQ / players / bookings).
--
-- Access model:
--   - Anyone can create (rate-limited API). No login.
--   - organizer_token (random, unique) = the organizer's edit key,
--     carried in their private manage URL (same pattern as booking
--     cancel_token).
--   - Pages are unlisted: reachable by link only, EXCEPT tournaments
--     flagged is_official (admin-curated) which show on /leagues.
--   - is_hidden = admin kill switch (page 404s).
-- ============================================================

create table if not exists americano_tournaments (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  format           text not null default 'americano' check (format in ('americano', 'mexicano')),
  points_per_match int  not null,
  courts           int  not null default 2,
  played_on        date not null,
  status           text not null default 'active' check (status in ('active', 'completed')),
  players          jsonb not null,               -- [{ id: 0, name: 'Ali' }, ...]
  rounds           jsonb not null default '[]',  -- [{ matches: [{ court, team1: [pid,pid], team2: [pid,pid], score1, score2 }], sitOut: [pid] }]
  organizer_token  text not null unique,
  is_official      boolean not null default false,
  is_hidden        boolean not null default false,
  completed_at     timestamptz,
  created_at       timestamptz not null default now()
);

-- /leagues listing reads: official, visible, newest first
create index if not exists americano_official_idx
  on americano_tournaments (is_official, is_hidden, played_on desc);

-- RLS: all reads/writes go through service-role API routes (same posture as
-- accounts / match_iq_seasons). No public policy -> locked by default.
alter table americano_tournaments enable row level security;

-- ============================================================
-- Verify after running:
--   select count(*) from americano_tournaments;  -- expect 0
-- ============================================================
