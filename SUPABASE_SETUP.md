# Connecting Supabase to Matchbox Bookings

When you're ready to go live with real bookings, follow these steps exactly.
Takes about 10 minutes. Supabase is **free** for this scale.

---

## Step 1 — Create a Supabase project

1. Go to **supabase.com** and sign up (free)
2. Click **New Project**
3. Name it `matchbox` (or anything you like)
4. Choose a strong database password — save it somewhere
5. Select region: **Southeast Asia (Singapore)** — closest to Pakistan
6. Click **Create new project** — wait ~2 minutes for it to provision

---

## Step 2 — Run the database schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Paste and run the following SQL:

```sql
-- Bookings table
create table bookings (
  id uuid primary key default gen_random_uuid(),
  court text not null check (court in ('A', 'B')),
  date date not null,
  start_time text not null,   -- e.g. '18:00'
  end_time text not null,     -- e.g. '20:00'
  duration_hours numeric not null,
  name text not null,
  phone text not null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  total_price integer not null,
  ref text not null unique,
  created_at timestamptz default now()
);

-- Index for fast availability lookups
create index bookings_date_court_idx on bookings (date, court);

-- Enable Row Level Security
alter table bookings enable row level security;

-- Public can insert (new bookings) and read non-cancelled bookings
create policy "Anyone can create a booking"
  on bookings for insert
  with check (true);

create policy "Anyone can view non-cancelled bookings"
  on bookings for select
  using (status != 'cancelled');

-- Only service role (your admin API) can update/delete
-- (Your PATCH/DELETE routes use the service role key — see Step 3)
```

4. Click **Run** — you should see "Success. No rows returned."

---

## Step 3 — Get your API keys

1. In Supabase, go to **Settings → API**
2. Copy these two values:
   - **Project URL** — looks like `https://xxxx.supabase.co`
   - **anon / public key** — the long JWT starting with `eyJ...`
   - **service_role key** — another long JWT (keep this secret — admin only)

---

## Step 4 — Add keys to your project

Create a file called `.env.local` in the root of `matchbox-website/`:

```bash
# .env.local — DO NOT commit this file (it's already in .gitignore)

NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...

# Admin dashboard password — change this to something strong
ADMIN_PASSWORD=your-strong-password-here
```

---

## Step 5 — Install Supabase client library

```bash
cd /Users/azamali/Matchbox/website/matchbox-website
npm install @supabase/supabase-js
```

---

## Step 6 — Create the Supabase client file

Create `lib/supabase.ts`:

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Public client — for booking reads and inserts
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// Admin client — for status updates and deletes (uses service role)
export const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey)
```

---

## Step 7 — Uncomment the Supabase code in API routes

Open each of these files and uncomment the `// ── Supabase implementation ──` blocks,
then delete or comment out the `DEMO_MODE` branches:

- `app/api/bookings/route.ts`
- `app/api/bookings/[id]/route.ts`

The Supabase code is already written in those files — just commented out.

---

## Step 8 — Update the field names (snake_case → camelCase)

The Supabase schema uses `snake_case` (e.g. `start_time`, `duration_hours`).
The app uses `camelCase`. When you uncomment the Supabase code, update the
insert/select to map correctly, or use a database view with camelCase aliases.

Quick mapping:
| App field | DB column |
|---|---|
| `startTime` | `start_time` |
| `endTime` | `end_time` |
| `durationHours` | `duration_hours` |
| `totalPrice` | `total_price` |
| `createdAt` | `created_at` |

---

## Step 9 — Restart and test

```bash
npm run dev
```

Visit `/booking` — it should work with no "Demo mode" banner.
Create a test booking, then visit `/admin` (password from `.env.local`) and confirm it.

---

## Done ✓

Once this is working, the booking system is fully live. The mock data in `lib/mock-data.ts`
is no longer used — everything reads and writes to your Supabase database.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Supabase not configured" error | Check `.env.local` exists and keys are correct. Restart the dev server. |
| RLS policy error on insert | Re-run the SQL in Step 2 — the policy may not have been created |
| Admin can't update bookings | Make sure `SUPABASE_SERVICE_ROLE_KEY` is set and you're using `supabaseAdmin` in PATCH/DELETE routes |
| Slots showing wrong availability | Check that the `doesBookingOverlapSlot` logic handles midnight crossover correctly |
