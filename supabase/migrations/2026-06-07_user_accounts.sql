-- ============================================================
-- User Accounts — clean, additive upgrade
-- Run in Supabase SQL Editor (project ref: ilremifudktcbwkmtmbg).
--
-- SAFE: nothing is dropped. This only ADDS two tables, NORMALIZES
-- existing phone numbers to one format, and PRE-SEEDS an account
-- for each existing Match IQ player (so they keep all progress and
-- just "claim" their profile on first login).
--
-- Rollback net: backups/pre-accounts-2026-06-07.json
-- ============================================================

-- 1. Canonical phone format helper (Pakistan / E.164: +923XXXXXXXXX).
--    Mirrors lib/phone.ts so SQL and app agree. Idempotent on already-clean values.
create or replace function normalize_phone(raw text)
returns text as $$
declare
  digits text;
begin
  if raw is null then return null; end if;
  -- keep a leading + (intl) but strip everything else non-numeric
  digits := regexp_replace(raw, '[^0-9]', '', 'g');
  -- 0XXXXXXXXXX  (local, 11 digits starting 0)  -> +92XXXXXXXXXX (drop the 0)
  if digits ~ '^0[0-9]{10}$' then
    return '+92' || substring(digits from 2);
  end if;
  -- 92XXXXXXXXXX (with country code, no +)       -> +92XXXXXXXXXX
  if digits ~ '^92[0-9]{10}$' then
    return '+' || digits;
  end if;
  -- 3XXXXXXXXX   (10 digits, missing leading 0)  -> +923XXXXXXXXX
  if digits ~ '^3[0-9]{9}$' then
    return '+92' || digits;
  end if;
  -- already +92XXXXXXXXXX
  if raw ~ '^\+92[0-9]{10}$' then
    return raw;
  end if;
  -- unknown shape: return a best-effort +<digits> so it's at least consistent
  return '+' || digits;
end;
$$ language plpgsql immutable;

-- 2. accounts — the identity layer. Phone is the unique key (the spine that
--    ties bookings/credits/Match IQ together). Email is the login channel;
--    nullable because match-only players have no email until they claim.
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  email text,                                  -- filled at claim for match-only players
  name text not null,
  verified_at timestamptz,                     -- null until first magic-link click
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_phone_idx on accounts (phone);
create unique index if not exists accounts_email_lower_idx
  on accounts (lower(email)) where email is not null;

-- 3. account_login_tokens — single-use magic links (login / signup / claim).
create table if not exists account_login_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  account_id uuid not null references accounts(id) on delete cascade,
  email text not null,                         -- the inbox this link verifies
  purpose text not null default 'login'
    check (purpose in ('login','signup','claim')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists account_login_tokens_token_idx on account_login_tokens (token);
create index if not exists account_login_tokens_account_idx on account_login_tokens (account_id);

-- 4. Normalize existing phone numbers so "one account per phone" holds and all
--    phone-keyed joins (players ↔ credits ↔ bookings ↔ accounts) line up.
update players set phone = normalize_phone(phone)
  where phone is not null and phone <> normalize_phone(phone);

-- (bookings + credits are currently empty, but normalize defensively in case
--  rows exist by the time this runs.)
update bookings set phone = normalize_phone(phone)
  where phone is not null and phone <> normalize_phone(phone);
update credits set phone = normalize_phone(phone)
  where phone is not null and phone <> normalize_phone(phone);

-- 5. Pre-seed one account per existing player. Name + normalized phone carried
--    over; email left null (claimed on first signup); verified_at null (unverified
--    until they click their first magic link). Their Match IQ rating already hangs
--    off this phone, so claiming surfaces it with zero data movement.
--    distinct on (phone) guards against any two players normalizing to the same number.
insert into accounts (phone, name)
select distinct on (normalize_phone(phone))
       normalize_phone(phone), name
from players
where phone is not null
order by normalize_phone(phone), created_at asc
on conflict (phone) do nothing;

-- 6. RLS. All account access goes through service-role API routes, so no public
--    policies — locked down by default once RLS is on.
alter table accounts enable row level security;
alter table account_login_tokens enable row level security;

-- 7. keep updated_at fresh (set_updated_at() already exists from the booking migration)
drop trigger if exists accounts_set_updated_at on accounts;
create trigger accounts_set_updated_at
  before update on accounts
  for each row execute function set_updated_at();

-- ============================================================
-- Verify after running:
--   select count(*) from accounts;                 -- expect 11
--   select phone, name, email, verified_at from accounts order by name;
--   select phone from players order by phone;       -- all +92...
-- ============================================================
