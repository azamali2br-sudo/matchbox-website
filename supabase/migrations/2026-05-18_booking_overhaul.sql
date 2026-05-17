-- ============================================================
-- Booking Dashboard Overhaul — Phase 1 + 1.5 + 2
-- Run in Supabase SQL Editor.
-- Wipes existing bookings (all dummy data, confirmed safe).
-- Match IQ tables untouched.
-- ============================================================

-- 1. Drop the old bookings table.
drop table if exists credit_redemption_tokens cascade;
drop table if exists credits cascade;
drop table if exists payments cascade;
drop table if exists bookings cascade;

-- 2. Bookings — two-axis state (attendance × payment), extras scaffold, cancellation log.
create table bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  court text not null check (court in ('A', 'B')),
  date date not null,
  start_time text not null,
  end_time text not null,
  duration_hours numeric not null,

  -- customer (phone IS the account)
  name text not null,
  phone text not null,
  email text not null,

  -- attendance axis
  attendance text not null default 'booked'
    check (attendance in ('booked','attended','no_show','cancelled')),

  -- pricing
  court_total integer not null,
  extras_total integer not null default 0,
  grand_total integer generated always as (court_total + extras_total) stored,
  credit_applied integer not null default 0,
  paid_amount integer not null default 0,

  -- payment hold (30-min window for online checkout)
  hold_expires_at timestamptz,

  -- consent
  terms_accepted_at timestamptz,

  -- cancellation
  cancel_token text unique,
  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by in ('customer','admin')),
  hours_before_slot_at_cancel numeric,

  -- ops
  admin_note text,
  source text not null default 'online' check (source in ('online','admin','whatsapp')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_date_court_idx on bookings (date, court);
create index bookings_phone_idx on bookings (phone);
create index bookings_attendance_idx on bookings (attendance);
create index bookings_cancel_token_idx on bookings (cancel_token);

-- 3. Payments — one row per actual receipt. paid_amount on bookings = sum of these.
create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  amount integer not null,
  method text not null check (method in ('bank','cash','credit','online','on_account')),
  paid_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index payments_booking_idx on payments (booking_id);
create index payments_paid_at_idx on payments (paid_at);

-- 4. Credits — keyed by phone. Negative rows = reversals/spends.
create table credits (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  amount integer not null,
  source text not null check (source in ('prepay_reward','cancel_refund','manual_adjust','redemption')),
  note text,
  booking_id uuid references bookings(id) on delete set null,
  used_in_booking_id uuid references bookings(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index credits_phone_idx on credits (phone);
create index credits_expires_idx on credits (expires_at);

-- 5. Credit redemption magic-link tokens (Phase 2).
create table credit_redemption_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  phone text not null,
  email text not null,
  booking_id uuid not null references bookings(id) on delete cascade,
  amount integer not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index credit_redemption_tokens_token_idx on credit_redemption_tokens (token);

-- 6. RLS
alter table bookings enable row level security;
alter table payments enable row level security;
alter table credits enable row level security;
alter table credit_redemption_tokens enable row level security;

-- Public can create bookings and read non-cancelled ones (for slot availability).
-- Writes to payments/credits/tokens all go via the service role from admin routes,
-- so no public policies needed for those.
create policy "Anyone can create a booking" on bookings for insert with check (true);
create policy "Anyone can view non-cancelled bookings" on bookings for select
  using (attendance != 'cancelled');

-- 7. updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();

-- ============================================================
-- Done. Verify with:
--   select count(*) from bookings;     -- expect 0
--   select count(*) from payments;     -- expect 0
--   select count(*) from credits;      -- expect 0
-- ============================================================
