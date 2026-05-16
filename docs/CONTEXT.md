# Matchbox Website — Full Project Context

*Created: 2026-05-05*
*Last updated: 2026-05-16 (session 5)*
*Owner: Azam (azamali2br@gmail.com)*

This document is the single source of truth for the Matchbox website project. Re-read at the start of any website-related session.

---

## 1. Project overview

- **Goal:** Build a brand-new website for Matchbox Padel Club, replacing the old vendor-built one that cost ~PKR 250K and never functioned.
- **Domain:** matchboxpadel.com (not yet connected to Vercel — pending DNS setup)
- **Hosting:** Vercel (Hobby plan, free) — **LIVE at https://matchbox-website.vercel.app**
- **GitHub repo:** https://github.com/azamali2br-sudo/matchbox-website
- **Local path:** `/Users/azamali/Matchbox/website/matchbox-website/`
- **Active branch:** `v2` (all current work lives here; main is behind)
- **Stable tag:** `v1.0` (original homepage-only version, safe fallback), `v2.0` (Supabase + Match IQ complete)
- **Vercel account:** azamali2br-8739
- **Vercel CLI:** logged in, `vercel --prod` deploys from project directory

---

## 2. Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router) | Native Vercel support, zero config deployment |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS v4 | Utility-first, co-designed with Vercel |
| Fonts | next/font (local + Google) | Optimized, no flash of unstyled text |
| Database | Supabase — **CONNECTED AND LIVE** | Managed Postgres + auth + storage |
| Hosting | Vercel — **LIVE** | One-click deploy from GitHub |

---

## 3. Brand system (locked — do not deviate)

### Colors
| Name | Hex | Usage |
|---|---|---|
| Navy | `#181F49` | Primary background, dominant everywhere |
| Orange | `#F68E3B` | Accent, CTAs, highlights, headings |

Only 2 official brand colors. No others.

### Fonts
| Font | Role | Source |
|---|---|---|
| Qaranta Bold | All headings, section titles, logo text | `/public/fonts/qaranta-bold.otf` (local) |
| Poppins | All body copy, labels, subtext | Google Fonts (Regular, Medium, Semi Bold) |

### Logo variants (in `/public/logos/`)
| File | Use on |
|---|---|
| `Matchbox-SecondaryLogo-02.png` | Navbar and footer (dark backgrounds) |
| `Matchbox-SecondaryLogo-01.png` | Light background contexts |
| `Matchbox-SecondaryLogo-03.png` | Orange background contexts |
| `Matchbox-PrimaryLogo-03 (1/2/3).png` | Stacked logo — light/dark/orange variants |
| `Matchbox-Icon-01/02/03.png` | Standalone icon — light/dark/orange variants |

### Logo rules (from brand kit)
- Never change colors, distort, rotate, move components, add effects, or change type style
- Light background → navy logo (variant 01)
- Dark background → white/orange logo (variant 02)
- Orange background → white logo (variant 03)

### Brand positioning
- "Pakistan's first tech-driven padel club"
- Vision: "Competition, community, and comfort"
- Tone: bold, community-first, competitive yet welcoming, tech-forward

---

## 4. Images (in `/public/images/`)

All 8 images are Unsplash padel/sport photos. **Real Matchbox facility photos are still pending — swap when available.**

| File | Used in | Notes |
|---|---|---|
| `vincenzo-morelli-OHau1zi6oLc-unsplash.jpg` | Hero (right panel) | Dark moody player action shot |
| `vincenzo-morelli-Cj35lHL4atY-unsplash.jpg` | Gallery (large left) | Overhead court with rackets |
| `bruno-vaccaro-vercellino-a4SslXtr1TE-unsplash.jpg` | Courts — Box A card | Clean outdoor courts |
| `oliver-sjostrom-sZKLku0YnFM-unsplash.jpg` | Courts — Box B card | Player with racket |
| `sergio-contreras-wLAtpQ53Pfw-unsplash.jpg` | Gallery (top right) | 5 rackets flat lay |
| `jorgen-hendriksen-IPvM5oJcunY-unsplash.jpg` | Gallery (bottom right) | Ball at net |
| `dima-khudorozhkov-0KqOLMF3bfs-unsplash.jpg` | Unused | Looks like table tennis — skip |
| `jose-alejandro-cuffia-NtiZoP2CKOs-unsplash.jpg` | Unused | Aerial worn courts — avoid |

---

## 5. Pages — plan and status

### Page 1: Homepage `/` — BUILT ✓
Sections in order:
1. **Hero** — Split layout: text left, real player action photo right with navy blend overlay
2. **Features** — 4 cards: 2 Premium Courts, Match IQ Ratings, Thriving Community, Instant Booking
3. **Gallery** — 3-photo editorial grid (overhead court, rackets flat lay, ball at net)
4. **Courts** — Box A (Most Popular) + Box B (Hidden Gem) — real photos at card top with hover zoom
5. **Pricing** — Off-Peak PKR 1,500/hr (6am–6pm) + Peak PKR 3,250/hr (6pm–6am)
6. **Match IQ Teaser** — Elo system explanation + mock leaderboard preview
7. **Leagues Teaser** — Coming soon, 16-team format, Division 1 & 2, WhatsApp CTA
8. **Location** — Google Maps embed + location card + WhatsApp card + hours card

### Page 2: Booking `/booking` — BUILT ✓ + SUPABASE LIVE ✓
Full booking system UI (frontend complete, Supabase connected and live):
- 24-slot grid per day (1-hr blocks, 12 AM – 11 PM natural calendar order), Box A / Box B tabs
- Date navigation (prev/next + date input, max 30 days ahead)
- Slot states: Available, Pending (amber), Confirmed/Taken (red), Selected (orange)
- Peak/off-peak pricing shown per slot; mixed-rate billing calculated per 30-min block
- Duration selector: 1hr, 1.5hr, 2hr, 2.5hr, 3hr
- Guest form: name, phone, email with validation
- 30-minute hold on submit: slot goes Pending, auto-releases if not confirmed by admin
- Success screen: booking summary + hold expiry time + bank transfer instructions + prefilled WhatsApp message
- Demo mode banner gone — real Supabase data

### Page 3: Leagues & Tournaments `/leagues` — BUILT ✓
Full page:
- Hero with registration CTA
- Stats bar (16 teams, 2 divisions, 2–3 month season, etc.)
- Division 1/2 cards with promotion/relegation explanation
- 4-step format breakdown
- FAQ section (6 questions)
- CTA section with WhatsApp registration link

### Page 4: Match IQ `/match-iq` — FULLY BUILT ✓
See §10 for full Match IQ documentation.

### Page 5: Admin `/admin` — BUILT ✓
Password-protected dashboard:
- **Tab 1: Bookings** — list with filters, confirm/unconfirm/cancel/delete, hold expiry countdown
- **Tab 2: Match IQ** — pending match submissions with approve/reject; approval triggers Elo update; shows court + start time per match
- Login via sessionStorage + `/api/admin/auth` route
- Password: `<stored in Vercel env ADMIN_PASSWORD — pull via `vercel env pull`>` — change via `ADMIN_PASSWORD` env var before going public

---

## 6. File structure (key files)

```
matchbox-website/
├── app/
│   ├── page.tsx                              ← Homepage
│   ├── layout.tsx                            ← Root layout (Navbar + Footer)
│   ├── globals.css                           ← Tailwind theme (colors + fonts)
│   ├── booking/
│   │   ├── page.tsx                          ← Metadata shell
│   │   └── BookingClient.tsx                 ← Full booking UI
│   ├── leagues/page.tsx                      ← Full leagues page
│   ├── match-iq/
│   │   ├── page.tsx                          ← Metadata shell → MatchIQClient
│   │   ├── MatchIQClient.tsx                 ← Leaderboard + Recent Matches tabs
│   │   ├── [playerId]/page.tsx               ← Player profile (rating, graph, history)
│   │   └── submit/page.tsx                   ← Match submission form
│   ├── admin/
│   │   ├── page.tsx                          ← Metadata shell
│   │   └── AdminClient.tsx                   ← Bookings tab + Match IQ tab
│   └── api/
│       ├── bookings/
│       │   ├── route.ts                      ← GET (list) + POST (create)
│       │   └── [id]/route.ts                 ← PATCH (update status) + DELETE
│       ├── admin/
│       │   └── auth/route.ts                 ← Password verification
│       └── match-iq/
│           ├── players/
│           │   ├── route.ts                  ← GET all players (leaderboard) or ?phone=xxx lookup
│           │   └── [id]/route.ts             ← GET single player + rating history + match history (includes set_scores)
│           └── matches/
│               ├── route.ts                  ← GET (list + real total count + matchRatings map) + POST (submit)
│               └── [id]/route.ts             ← PATCH (approve/reject — triggers Elo, single update pass)
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── home/
│       ├── Hero.tsx, Features.tsx, Gallery.tsx, Courts.tsx
│       ├── Pricing.tsx, MatchIQTeaser.tsx, LeaguesTeaser.tsx, Location.tsx
├── lib/
│   ├── constants.ts                          ← Times, prices, helpers, formatters
│   ├── mock-data.ts                          ← Demo bookings (still used as fallback)
│   ├── supabase.ts                           ← Supabase public + admin clients
│   └── elo.ts                                ← Elo formula (K=20, floor=20, ceiling=95, integer output)
├── public/
│   ├── fonts/qaranta-bold.otf
│   ├── logos/
│   └── images/
├── SUPABASE_SETUP.md                         ← Step-by-step setup guide (now complete)
└── .env.local                                ← Supabase keys + admin password (not committed)
```

---

## 7. Supabase — CONNECTED AND LIVE

- **Project:** ilremifudktcbwkmtmbg (Mumbai region)
- **URL:** https://ilremifudktcbwkmtmbg.supabase.co
- **Anon key, service role key, DB password:** stored in Vercel env vars (production) and locally in `.env.local` (gitignored). To pull a local copy: `vercel env pull .env.local` from the project root. **Never paste real secret values into this file** — GitHub push protection blocks it, and we want to keep it that way.
- **psql path for direct DB access:** `/opt/homebrew/opt/postgresql@18/bin/psql`

### Tables created in Supabase:

**bookings**
```
id uuid PK, court text (A|B), date date, start_time text, end_time text,
duration_hours numeric, name text, phone text, email text,
status text (pending|confirmed|cancelled), total_price integer,
ref text unique, hold_expires_at timestamptz, created_at timestamptz
```

**players** (Match IQ)
```
id uuid PK, name text, phone text unique, rating numeric default 60,
wins integer default 0, losses integer default 0, created_at timestamptz
```

**matches** (Match IQ)
```
id uuid PK, played_on date,
court text (A|B, nullable),          ← added session 4
start_time text (nullable),          ← added session 4
team1_p1 uuid FK→players, team1_p2 uuid FK→players,
team2_p1 uuid FK→players, team2_p2 uuid FK→players,
team1_score integer (sets won), team2_score integer (sets won),
set_scores jsonb (optional: [{t1,t2},{t1,t2},...]),
status text (pending|approved|rejected),
submitted_by text, created_at timestamptz
```

**rating_history** (Match IQ)
```
id uuid PK, player_id uuid FK→players, rating numeric,
match_id uuid FK→matches, created_at timestamptz
```

### RLS policies:
- Bookings: public insert + select (non-cancelled); service role for update/delete
- Players: service role for all (all Match IQ API routes use supabaseAdmin — public client caused RLS errors)
- Matches: service role for all (same reason)
- Rating history: public read

### Important: all Match IQ API writes use supabaseAdmin (service role)
The public anon client was causing RLS violations on match inserts. All routes in `/api/match-iq/` now use `supabaseAdmin` exclusively. This is safe because they are server-side API routes — the service role key is never exposed to the browser.

### Vercel env vars set (names only — real values live in Vercel + `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL          # public — https://ilremifudktcbwkmtmbg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     # secret — pull via `vercel env pull .env.local`
SUPABASE_SERVICE_ROLE_KEY         # secret — never log, never paste
ADMIN_PASSWORD                    # secret — currently a weak default, change before going public
RESEND_API_KEY                    # secret — send-only Resend key (added 2026-05-16)
EMAIL_FROM                        # optional — set after matchboxpadel.com domain verified in Resend
```

**Note:** When setting env vars via Vercel CLI, always use `printf` not `echo` — `echo` appends a trailing newline that gets stored as part of the value and breaks authentication.

---

## 8. Contact & operational details

| Item | Value |
|---|---|
| WhatsApp (public) | +923222172629 |
| WhatsApp link | https://wa.me/923222172629 |
| Location | Malir Cantt, Karachi |
| Google Maps | https://maps.app.goo.gl/fv8JrRiBJFiSrWJh7 |
| Domain | matchboxpadel.com (not yet connected to Vercel) |
| Peak hours | 6:00 PM – 6:00 AM |
| Off-peak hours | 6:00 AM – 6:00 PM |
| Peak price | PKR 3,250 / hour |
| Off-peak price | PKR 1,500 / hour |
| Min booking | 1 hour |
| Increments | 30 minutes |
| Courts | Box A (Most Popular) + Box B (Hidden Gem) |
| Admin password | `<stored in Vercel env ADMIN_PASSWORD — pull via `vercel env pull`>` (change via ADMIN_PASSWORD in Vercel env vars before going public) |

---

## 9. Booking system — current state

### What's live (Supabase connected)
- Full calendar/slot UI at `/booking`
- API routes at `/api/bookings` (GET, POST, PATCH, DELETE)
- Admin dashboard at `/admin` → Bookings tab
- 30-minute hold with auto-expiry (runs on every GET via Supabase update)
- No demo mode banner — real database

### Slot status system
- **Available** — white/light, clickable
- **Pending** — amber, blocked; auto-expires after 30 min → returns to Available
- **Confirmed** — red/taken, blocked
- **Selected** — orange highlight

### Payment flow
1. Customer books → slot goes Pending
2. Customer sees success screen with bank transfer details
3. Customer sends payment screenshot to WhatsApp
4. Admin visits `/admin` → Bookings tab, clicks Confirm
5. Slot turns Confirmed

### Bank details (STILL PLACEHOLDER — update before going live)
In `lib/constants.ts`:
- Bank: Meezan Bank
- Account Title: Matchbox Padel Club
- IBAN: `PK00MEZN0001234567890123` ← **UPDATE THIS**

---

## 10. Match IQ — FULLY BUILT ✓

### Philosophy
- Elo-based, 2v2 padel rating system
- Pakistan's first padel Elo system — key competitive moat vs Maidan
- Matchbox players only (not open community)
- Admin is the sole approval layer — every submitted match requires Azam's approval before ratings update

### Elo formula (lib/elo.ts)
- **K factor:** 20 (easily changed — one line in lib/elo.ts)
- **Starting rating:** 60
- **Floor:** 20 (cannot go below)
- **Ceiling:** 95 (cannot reach 100)
- **Team rating:** average of 2 players' ratings
- **Formula:** delta = K × (actual − expected); expected = 1 / (1 + 10^((opp−my)/400))
- Win = actual 1, loss = actual 0
- **Output: integer only** — ratings stored and displayed as whole numbers, no decimals

### Score format
- **One match = best of 3 sets** (fixed unit for Elo consistency)
- **Score entered as sets won:** 2–0 or 2–1 (validated — one team must have 2)
- **Optional set scores:** "+ Add set scores" expander shows per-set score inputs
  - 2–0 → 2 set rows; 2–1 → 3 set rows (auto-adjusts)
  - Stored as JSONB: `[{t1:6,t2:4},{t1:7,t2:5}]`
  - If filled, history shows: **2–1** *(6–4, 3–6, 7–5)*
  - If skipped, history shows: **2–1**
- If players have a longer booking and play two rounds → submit two separate matches
- Best of 5 deliberately NOT supported

### Court + time slot tracking (added session 4)
- Submit form has a **Court selector** (Box A / Box B toggle) and **Start Time dropdown** (all 24 hourly slots, formatted 12-hour)
- Both fields are required on submission
- Stored as `court` (text) and `start_time` (text) on the matches table
- Admin Match IQ tab shows: `Played 7 May · Box A · 7:00 PM · Submitted by 03xxx`
- Recent Matches public cards show court + time in the footer row

### Player registration
- No sign-up required
- Players are auto-created when their phone number appears in a first match submission
- Phone is the unique identifier
- If phone is already known, name auto-fills (read-only) on submit form — prevents name spoofing
- Duplicate phone check on submit form — all 4 players must have different phone numbers

### Pages built
| Page | URL | What it shows |
|---|---|---|
| Leaderboard | `/match-iq` | Live rankings + recent matches tabs; stats strip (real counts); Submit Match CTA |
| Player profile | `/match-iq/[playerId]` | Rating (integer), W/L, win rate, rating graph (SVG, orange=rising/red=falling), match history with set scores |
| Submit match | `/match-iq/submit` | 4-player form, court selector, time dropdown, sets won, optional set scores, phone lookup |

### Leaderboard columns
Rank · Player · Rating · W / L · Win%

### Recent Matches cards (redesigned session 4)
- **Accent border:** 2px orange left border if Team 1 won, right border if Team 2 won
- **Rating pills:** each player's rating at time of match shown as small badge inline with their name — orange-tinted for winners, muted for losers
- **Historical ratings:** fetched from `rating_history` table (ratings at time of match, not current). Falls back to current rating if no history entry exists.
- **Team averages:** shown above the score when rating gap ≥ 5 points — surfaces mismatches
- **Upset badge:** amber pill in footer when the lower-rated team wins
- **Footer row:** date · court · start time — separated from match content by a thin border
- **Winner/loser contrast:** winning team names at full brightness, losing team at 40% opacity

### Admin flow
1. Player submits match → appears in `/admin` → Match IQ tab as "pending"
2. Admin reviews: names, score, court, time
3. **Approve** → Elo ratings update for all 4 players, wins/losses incremented, rating_history rows inserted, match marked approved
4. **Reject** → match discarded, no rating changes

### API routes
| Route | Method | What it does |
|---|---|---|
| `/api/match-iq/players` | GET | All players sorted by rating; or `?phone=xxx` for single lookup |
| `/api/match-iq/players/[id]` | GET | Player + rating history + match history (includes set_scores) |
| `/api/match-iq/matches` | GET | Matches by status + real total count + matchRatings map (rating_history lookup) |
| `/api/match-iq/matches` | POST | Submit match (auto-creates new players; stores court + start_time) |
| `/api/match-iq/matches/[id]` | PATCH | Admin: approve (single correct update pass) or reject |

### Known security limitations (by design for now)
- Only one person submits on behalf of all 4 players — admin approval is the sole trust layer
- No phone ownership verification — someone could register another player's phone on first use
- Admin (Azam) knows the community personally and can spot fake submissions
- **Vouch system** (future): all 4 players confirm via WhatsApp/OTP before ratings update — build when community reaches scale where admin approval becomes a bottleneck

### What's NOT built yet (future)
- **Vouch system** — all 4 players confirm before admin approval
- **Player login/auth** — anyone can submit; phone lookup prevents name spoofing but no auth
- **Season resets** — ratings accumulate forever; no concept of seasons
- **Match IQ homepage teaser** — currently shows mock data; wire to real leaderboard data when ready

---

## 11. Design decisions & rationale

| Decision | Choice | Why |
|---|---|---|
| Color scheme | Dark navy dominant | Matches brand, premium feel |
| Hero style | Split layout — text left, player image right | Real imagery over geometric shapes |
| Gallery section | 3-photo editorial grid | Adds life between Features and Courts |
| Courts cards | Photo at top with hover zoom | Visual proof of the courts |
| Booking CTA placement | Hero + Navbar + Courts + Pricing | Booking = primary revenue action |
| Payment method | WhatsApp bank transfer screenshot | No payment gateway, avoids 2–3% fees |
| Guest vs account booking | Guest booking | Account creation kills conversion |
| Box B messaging | "Hidden Gem" | Addresses perception gap without calling attention |
| Map embed | Google Maps iframe | Location is a purchase factor |
| Admin auth | Simple password (sessionStorage) | No auth library needed |
| Slot order | 00:00 → 23:00 (midnight-first) | Natural calendar day; 6AM-start caused confusion |
| Pending hold duration | 30 minutes (auto-expiry) | Prevents squatted slots; creates urgency |
| Mixed peak pricing | Per-30-min block calculation | 5PM→7PM correctly splits off-peak + peak |
| Match score format | Sets won (2-0 or 2-1) + optional set scores | Standard padel; Elo only needs W/L; detail is competitive moat |
| Match IQ K factor | K=20 | Fast enough to feel rewarding for ~200-player community; one-line change |
| Set scores | Optional, not required | Zero friction for non-submitters; richer history for engaged players |
| Best of 3 fixed | Yes | Consistent Elo unit; two matches in a long booking = more data |
| Ratings as integers | Yes | Cleaner display; decimal precision is false accuracy at K=20 |
| Historical ratings in match cards | Rating at time of match (from rating_history) | Shows how competitive the match actually was, not current standings |
| Upset detection threshold | Lower-rated team wins | Automatic — no manual flagging needed |
| Court + time on submission | Required fields | Allows cross-referencing with bookings; adds context for admin approval |
| supabaseAdmin for all Match IQ writes | Yes | Avoids RLS policy conflicts on server-side routes; safe because keys never reach browser |

---

## 12. Reference websites (design inspiration)

| Site | What to take |
|---|---|
| https://playtomic.com/ | Clean UX, frictionless booking, community-first |
| https://legendsarena.pk/ | Bold sports energy, Pakistan market |
| https://padelverse.net/ | Dark/premium aesthetic, narrative-driven copy |

---

## 13. Build order and completion status

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | Homepage v1 | ✓ Done | Original build |
| 2 | v1.0 Git tag | ✓ Done | Permanent fallback |
| 3 | v2 branch | ✓ Done | All work lives here |
| 4 | Hero with real image | ✓ Done | Split layout, player photo |
| 5 | Courts with real photos | ✓ Done | Photos at card top |
| 6 | Gallery section | ✓ Done | 3-photo editorial grid |
| 7 | Booking system (frontend) | ✓ Done | Full UI |
| 8 | Booking API routes | ✓ Done | Supabase connected |
| 9 | Admin dashboard | ✓ Done | Password-protected |
| 10 | Leagues page | ✓ Done | Full page |
| 11 | Supabase connection | ✓ Done | Live — real bookings persist |
| 12 | Vercel deployment | ✓ Done | Live at matchbox-website.vercel.app |
| 13 | Match IQ — leaderboard | ✓ Done | Rankings + Win% column + real match count |
| 14 | Match IQ — player profiles | ✓ Done | Integer rating, trend graph (orange/red), match history with set scores |
| 15 | Match IQ — submit form | ✓ Done | Phone lookup, duplicate guard, court selector, time dropdown, sets won, optional set scores |
| 16 | Match IQ — admin approval | ✓ Done | Approve triggers Elo (single clean pass); shows court + time |
| 17 | Match IQ — Elo engine | ✓ Done | K=20, floor 20, ceiling 95, integer output |
| 18 | Match IQ — court + time tracking | ✓ Done | Stored on matches table; shown on submit form, admin tab, match cards |
| 19 | Match IQ — historical ratings in cards | ✓ Done | Rating at time of match from rating_history; team avg; upset badge |
| 20 | Match IQ — redesigned match cards | ✓ Done | Accent border, rating pills, footer row, upset badge |
| 21 | Bug fixes (session 4) | ✓ Done | See session log for full list |
| 22 | Email confirmations (Resend) | ✓ LIVE | Wired into /api/bookings POST; RESEND_API_KEY set in Vercel prod; deployed 2026-05-16 (dpl_7qLc2pfb6MDtWr1jGA62PpQ2bNgS). Sender still `onboarding@resend.dev` — verify matchboxpadel.com in Resend dashboard to send from `bookings@matchboxpadel.com`. |
| 23 | Custom domain | ⏳ Pending | Connect matchboxpadel.com in Vercel dashboard |
| 24 | Real Matchbox photos | ⏳ Pending | Swap Unsplash stock when available |
| 25 | Bank account IBAN | ⏳ Pending | Update in lib/constants.ts |
| 26 | Admin password change | ⏳ Pending | Change ADMIN_PASSWORD in Vercel env vars before going public |
| 27 | Match IQ homepage teaser | ⏳ Pending | Wire to real leaderboard data instead of mock |
| 28 | Match IQ vouch system | ⏳ Future | All 4 players confirm before admin approval |
| 29 | Match IQ player auth | ⏳ Future | Prevent unauthorized submissions |
| 30 | Season resets | ⏳ Future | Rating seasons with resets |
| 31 | Aesthetics / copy polish | ⏳ Parked | Deliberately deferred — functional first |
| 32 | Customers table refactor | ⏳ Parked | Unify `bookings` and `players` under a single customer identity keyed by phone. Not urgent — phone is a soft key today. Revisit when reporting/retention queries become a real need. |
| 33 | WhatsApp API confirmations | ⏳ Parked | Twilio/360dialog on a second SIM (don't migrate +923222172629 — it'd break the community group capability). Pakistan SIM registration is a hassle; revisit when number is ready. |
| 34 | Resend custom sender domain | ⏳ Pending DNS | Domain `matchboxpadel.com` created in Resend (region: ap-northeast-1, Tokyo); records pending at Namecheap. Full DNS values in §19 below. Once added & verified, set `EMAIL_FROM=Matchbox <bookings@matchboxpadel.com>` in Vercel and redeploy. |

**Completion estimate: ~87% of fully shipped product** (email confirmations now live; custom sender domain is the remaining polish)

---

## 14. Deployment

- **Live URL:** https://matchbox-website.vercel.app
- **GitHub:** https://github.com/azamali2br-sudo/matchbox-website (branch: v2)
- **Deploy command:** `vercel --prod` from `/Users/azamali/Matchbox/website/matchbox-website/`
- Every deploy is manual for now (auto-deploy on push to main requires merging v2 → main first)
- **Latest commits:** `24347ac` (session 4 bugs/UX), `53a9a75` (match cards redesign + integer ratings)

### To connect matchboxpadel.com:
1. Vercel dashboard → Project → Settings → Domains → Add `matchboxpadel.com`
2. Vercel shows DNS records to add at domain registrar
3. Add them, wait ~10 min, SSL auto-provisions

### To go fully live (checklist):
- [ ] Connect matchboxpadel.com domain (Vercel) — point site at custom domain
- [ ] Verify matchboxpadel.com in Resend (see §19 — DNS records pending at Namecheap)
- [ ] Update bank IBAN in `lib/constants.ts`
- [ ] Change ADMIN_PASSWORD in Vercel env vars (use `printf`, not `echo`)
- [ ] Take real Matchbox facility photos + swap Unsplash images
- [ ] Wire Match IQ homepage teaser to real leaderboard data

---

## 15. How to run locally

```bash
cd /Users/azamali/Matchbox/website/matchbox-website
npm run dev
# Open http://localhost:3000
# Admin: http://localhost:3000/admin (password: see Vercel env ADMIN_PASSWORD)
```

---

## 16. Key pending decisions

- **Admin password** — change before going public (currently `<stored in Vercel env ADMIN_PASSWORD — pull via `vercel env pull`>`)
- **Bank IBAN** — update in `lib/constants.ts` (currently placeholder)
- **Custom domain** — DNS setup at domain registrar
- **Real facility photos** — whenever available; swap in `/public/images/`
- **Match IQ vouch system** — build when community is active enough to need it
- **Season structure** — decide if/when to introduce rating seasons
- **Match IQ teaser on homepage** — currently mock data; wire to real DB when leaderboard has enough players to look good

---

## 17. Git tags / version history

| Tag | What it marks |
|---|---|
| `v1.0` | Original homepage-only version — safe fallback |
| `v2.0` | Supabase live, Match IQ complete, deployed to Vercel |

Latest work is on `v2` branch (ahead of tag). No new tag created for session 4 work yet.

View on GitHub: github.com/azamali2br-sudo/matchbox-website/tags

---

## 18. Session log

| Date | What was done |
|---|---|
| 2026-05-05 | Homepage built and pushed to GitHub (v1) |
| 2026-05-06 (session 1) | v1.0 tag; v2 branch; Hero redesigned with real player image; Courts with real photos; Gallery section; All 8 images ported; Full booking system (calendar, slot grid, form, success screen, demo mode); Admin dashboard; Full Leagues page; Booking API routes (Supabase-ready); SUPABASE_SETUP.md; All pushed to GitHub v2 |
| 2026-05-06 (session 2) | Booking slot grid reordered 00:00→23:00; Mixed peak/off-peak pricing fixed (per-30-min block); 30-min auto-expiring hold (holdExpiresAt, expireHolds, customer expiry banner, admin countdown); Pushed to GitHub v2 (commit 5cbd0cb) |
| 2026-05-07 (session 3) | Vercel deployed (matchbox-website.vercel.app); Supabase connected (Mumbai region, real bookings live, demo mode gone); All Vercel env vars set via CLI; Full Match IQ system built: Elo engine (K=20), leaderboard page, player profile with rating graph, match submit form with phone lookup, admin Match IQ tab with approve/reject; Score format decided: sets won (2-0/2-1) + optional set scores via expandable panel; set_scores JSONB column added to matches table; All deployed to Vercel; v2.0 tag created on GitHub |
| 2026-05-16 (session 5) | **Email confirmations LIVE in production + Resend custom sender domain DNS pending.** See detailed §19 below for full DNS values and resume path. Summary: (1) Discussed WhatsApp API vs email vs SMS for booking notifications — picked email for now, parked WhatsApp API (needs 2nd SIM, +923222172629 must stay on Business App for community groups); (2) Discussed bookings vs Match IQ database org — concluded phone is a good-enough soft key today, parked customers-table refactor; (3) Built email confirmation system: installed `resend` npm SDK, created `lib/email.ts` with branded HTML template (navy header, orange CTA, booking details table, bank transfer block, prefilled WhatsApp screenshot link), wired into POST `/api/bookings` as fire-and-forget so a Resend outage never blocks a booking; (4) Connected Resend via Composio (send-only key — works for sending but can't manage domains); (5) Sent successful test email to azamali2br@gmail.com via Composio; (6) User created a second full-access Resend API key for the website (`re_EUiJZG...` — send scope, stored in Vercel only); (7) Added `RESEND_API_KEY` to Vercel prod env via `printf | vercel env add` (printf to avoid trailing newline bug); (8) Deployed via `vercel --prod` from local — deployment `dpl_7qLc2pfb6MDtWr1jGA62PpQ2bNgS` live at matchbox-website.vercel.app; (9) Bookings now auto-send branded email confirmations in production; (10) Created `matchboxpadel.com` domain entry in Resend via curl with full-access key — domain ID `3dd995da-cfa4-4138-aad7-27e0766fa582`, region ap-northeast-1 (Tokyo, closest to PK); (11) Pulled 3 DNS records (DKIM TXT, SPF MX, SPF TXT) — pending Namecheap setup by user. Until DNS verifies, sender stays `Matchbox <onboarding@resend.dev>` which works but looks unprofessional. Once user adds DNS records and verification flips to "verified", set `EMAIL_FROM=Matchbox <bookings@matchboxpadel.com>` in Vercel and redeploy. **Files changed:** `package.json` (+resend), `lib/email.ts` (new), `app/api/bookings/route.ts` (+fire-and-forget email send), `website-context.md` (this update). **Not yet committed to git** — local-only deploy via Vercel CLI; commit + push to v2 branch when convenient.
| 2026-05-07 (session 4) | **Bug fixes:** (1) Double-update in approve route removed — first corrupt pass used invalid Supabase increment syntax; (2) set_scores added to player profile API query — per-set detail now shows on profiles; (3) Rating graph color fixed — orange when trending up, red when trending down (line + fill + dots); (4) Matches Played stat fixed — now uses real DB count via count:exact instead of capped fetch limit; (5) Admin password fixed — was stored with trailing newline from echo command, re-set with printf; (6) RLS error on match submit fixed — all Match IQ API routes now use supabaseAdmin. **UX improvements:** (7) Duplicate phone validation on submit form; (8) Win% column on leaderboard replaces Matches column; (9) Recent Matches cards improved — winner full brightness, loser dimmed. **New features:** (10) Court (Box A/B) selector + Start Time dropdown added to submit form — both required; (11) court + start_time columns added to matches table in Supabase via psql; (12) Admin Match IQ tab shows court + time per pending match; (13) Historical ratings in Recent Matches — fetched from rating_history in single batch query, shows rating at time of match not current; (14) Team average ratings shown above score when gap ≥ 5; (15) Upset badge when lower-rated team wins; (16) Match cards fully redesigned — accent border on winner side, rating pills inline with names, footer row with date/court/time; (17) Integer ratings everywhere — elo.ts now stores whole numbers, all display points wrapped in Math.round(). Committed as two commits (24347ac, 53a9a75), pushed to GitHub v2. |

---

## 19. Resend custom sender domain — resume from here

**Status as of 2026-05-16:** Domain registered in Resend, awaiting DNS records at Namecheap.

### State
- **Resend domain ID:** `3dd995da-cfa4-4138-aad7-27e0766fa582`
- **Domain name:** `matchboxpadel.com`
- **Region:** `ap-northeast-1` (Tokyo — closest Resend region to Pakistan)
- **Status:** `not_started` (DNS records not yet added at registrar)
- **Registrar:** Namecheap
- **Sending API key in Vercel:** `RESEND_API_KEY` (send-only scope, scoped to website only) — already set
- **Full-access management API key (use for verify/manage operations):** stored locally; *do not commit*. To regenerate: Resend dashboard → API Keys → "Full access".

### Why we paused
DNS records must be pasted into Namecheap's Advanced DNS panel by the user (Namecheap is not in Composio, and DNS edits at registrar are user-action). Until those 3 records propagate, sender stays `Matchbox <onboarding@resend.dev>` — which works fine for now but isn't on-brand.

### The 3 DNS records to add at Namecheap

| # | Type | Host (Namecheap field) | Value | Priority | TTL |
|---|------|------------------------|-------|----------|-----|
| 1 | TXT  | `resend._domainkey`    | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDtWV20gO16W8X4H9dRZNEiRePI4ChTuzoP9gckG3EC/gx2JVjy8SzqLEiClYZvelkRdlOsJfh4mmPwGJDtdKeaDHeNSJ103iCSuQQDXhAYU+FI/AX9zKWkmSfMtEKg0VtnyX3YpCKRT2SVgj/NT9YbiQlKhQtOGJAYKfQnGY2dswIDAQAB` | — | Automatic |
| 2 | MX   | `send`                 | `feedback-smtp.ap-northeast-1.amazonses.com` | `10` | Automatic |
| 3 | TXT  | `send`                 | `v=spf1 include:amazonses.com ~all` | — | Automatic |

**Namecheap quirks to remember:**
- The "Host" field is just the prefix — Namecheap auto-appends `.matchboxpadel.com`. Don't include the full FQDN.
- Don't wrap TXT values in quotes.
- Click the green checkmark to save each row.
- Propagation: typically 5–30 min, sometimes a couple hours.

### Resume steps (once Azam has added the records)

1. **Trigger verification** (with full-access key):
   ```bash
   curl -X POST 'https://api.resend.com/domains/3dd995da-cfa4-4138-aad7-27e0766fa582/verify' \
     -H 'Authorization: Bearer <FULL_ACCESS_RESEND_KEY>'
   ```
2. **Poll status** until `status: "verified"`:
   ```bash
   curl 'https://api.resend.com/domains/3dd995da-cfa4-4138-aad7-27e0766fa582' \
     -H 'Authorization: Bearer <FULL_ACCESS_RESEND_KEY>' | python3 -m json.tool
   ```
3. **Set EMAIL_FROM in Vercel:**
   ```bash
   cd /Users/azamali/Matchbox/website/matchbox-website
   printf 'Matchbox <bookings@matchboxpadel.com>' | vercel env add EMAIL_FROM production
   ```
4. **Redeploy:**
   ```bash
   vercel --prod
   ```
5. **Test:** Make a real booking and confirm email arrives from `bookings@matchboxpadel.com`.
6. **Update §13 row 34** to ✓ Done and add a session log entry.

### Why this matters
- Deliverability: emails from a verified domain land in inbox; emails from `onboarding@resend.dev` get flagged or hit promo tabs more often.
- Branding: customer sees `bookings@matchboxpadel.com` — professional, matches the brand.
- Capacity: Resend's free tier counts both senders, but verified domain unlocks "send to anyone" reliably (the dev sender is technically intended for testing).
