<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# No fire-and-forget in route handlers

**Always `await` side-effect calls (emails, logging, analytics, etc.) before returning the HTTP response from a Vercel serverless function.** The runtime can freeze the function the moment the response returns, killing any unresolved promises. Pattern `somePromise.then(...)` after the return is silently dropped in production — intermittently — which is the hardest kind of bug to spot.

This is enforced for `app/api/**/*.ts` by `@typescript-eslint/no-floating-promises` in [eslint.config.mjs](eslint.config.mjs). If you have a genuinely background side effect that shouldn't block the response, use Next.js's `after()` from `next/server` (it tells the runtime to keep running until the callback resolves). Never just `.then(...)` and drop the promise.

# Deploy + environment facts (updated 2026-11-19)

- **Working branch is `v2`**, not `main`. Pushing `v2` only creates a *Preview* deployment. Production is promoted manually: `git push origin v2 && vercel --prod --yes`. Live URL: **https://www.matchboxpadel.com** (bare matchboxpadel.com 308-redirects to www; matchbox-website.vercel.app still serves the same deployment so old email links keep working).
- **Domain went live 2026-11-19.** DNS is at Namecheap: A `@` 216.198.79.1, CNAME `www` → Vercel, two `_vercel` TXT verification records (the domain had been claimed by another Vercel account). Never touch the MX (Private Email + `send` for Resend), SPF, `default._domainkey` or `resend._domainkey` records. `NEXT_PUBLIC_SITE_URL` = `https://www.matchboxpadel.com` (set with printf — no trailing newline). It is build-time, so changing it needs a redeploy. Cookies are host-only, so sessions belong to www.
- **Prod Supabase project ref is `ilremifudktcbwkmtmbg`.** Other unrelated projects exist under the same login — confirm the ref before any SQL. Keys are the new format (`sb_publishable_…` / `sb_secret_…`).
- **`.env.local` comes from `vercel env pull`** and stores values quoted with a literal `\n` escape inside (e.g. `"https://….supabase.co\n"`). Next.js's dotenv handles it; shell scripts must strip the quotes and the `\n` or curl fails with "URL malformed".
- **Vercel logs are short-lived** (Hobby ≈ 1 hour). `vercel logs --environment production --no-branch --no-follow --since 1h -x` reads them; `vercel logs <deployment-url>` streams live but the CLI auto-kills the stream after 5 minutes. Don't rely on logs for anything older than an hour.
- **Migrations are run by hand** in the Supabase SQL Editor — nothing applies them automatically. Pending as of 2026-09-22: `supabase/migrations/2026-09-22_booking_no_overlap.sql` (btree_gist exclusion constraint). The app is safe without it; it only closes the simultaneous-request race. Pending as of 2026-11-20: `supabase/migrations/2026-11-20_release_holds_cron.sql` — without it, lapsed holds are only released when someone opens a page that shows bookings (bug: Ali Alavi's test booking MBX-7KPD77 stayed "booked" overnight).

# Booking API rules (app/api/bookings/route.ts)

- **Admin vs online branching must key on the request body, not just the cookie.** The front-desk laptop keeps the Admin dashboard open, so its browser carries the admin session cookie *and* a customer's account session at the same time. A manual admin booking = admin cookie **and** the admin form's `name`/`phone` fields. Anything else is an online booking and takes identity from the account session. Deciding on the cookie alone caused every player booking from that laptop to fail with "Invalid name" (bug found 2026-09-22).
- **Surface real errors to the customer.** The booking page shows the server's `error` text (or `Server error (HTTP n)` when the body isn't JSON). Don't reintroduce a blanket "Something went wrong" — it hid the bug above for over a month. Any insert failure is `console.error`'d with code/details/slot context so it appears in Vercel logs.
- **Double bookings are prevented server-side.** POST releases lapsed holds, then checks the new slot against every non-cancelled booking on that court for the same date ±1 day (slots cross midnight; `end_time` wraps, so use `duration_hours` for span math) and returns 409 on a clash. Postgres error `23P01` (exclusion constraint) maps to the same 409. Only POST inserts bookings — keep it that way so this stays the single choke point.
- **Closure is 09:00–15:00 PKT and the server rejects any booking that *ends* after 09:00.** The page therefore treats 08:30 starts as closed (min booking is 1h). Keep client `isClosedHour` and the server rule in sync when either changes.
- **Client range check** (`isSlotRangeAvailable`) walks every 30-minute `TIME_SLOTS` entry the booking covers — `Math.round(hours * 2)` steps, not `Math.ceil(hours)`. The old loop only checked half the duration.
- **No rate limit on booking POSTs** (removed 2026-11-19 at Azam's request — the per-IP cap blocked players sharing the venue WiFi / carrier CGNAT). Online bookings require a login; don't reintroduce a per-IP limit.

# Credit, holds and account rules (bugs found + fixed 2026-11-19)

- **Cancel = claim first, credit second.** Both cancel routes flip the row with a guarded update (`.eq('attendance', 'booked')` / the attendance just read) and only issue credit if that update returned a row. Issuing credit before the flip let two simultaneous taps refund twice.
- **Holds live in `lib/holds.ts` only.** `releaseLapsedHolds()` (called by GET + POST `/api/bookings`, the manage-link routes, the account dashboard, and `/api/cron/release-holds` every 5 min via Supabase pg_cron — `supabase/migrations/2026-11-20_release_holds_cron.sql`; Vercel Hobby crons are daily-only) releases unpaid holds, returns any `credit_applied` to the customer, and sends the expired email. `clearHoldIfSettled()` must be called wherever credit is applied — once credit + cash cover the price, the hold is removed so the booking can't auto-release and swallow the credit.
- **Email lookups are exact.** `findAccountByEmail` escapes LIKE wildcards and then compares exactly in code (PostgREST also treats `*` as a wildcard). Never go back to a bare `.ilike('email', input)` — it handed lookalike addresses other people's login links.
- **Signup never reveals or attaches.** The response is always `{ ok: true }`; an existing account's link only goes to its email on file; a typed email is attached only when its magic link is clicked.
- **Times shown to people use `formatClockPKT()`** (lib/constants.ts). The server runs in UTC.
- **Bank details:** `BANK_DETAILS` is intentionally blank until the real account is supplied; `hasBankDetails()` switches the booking screen + pending email to "WhatsApp us for payment details".

# Customer self-service (added 2026-11-20)

- **Rescheduling** is `POST /api/bookings/reschedule/[token]` (auth = the booking's `cancel_token`, same as the manage page). Ref + token never change, so old email links keep working. Rules: unpaid bookings can move any time before the slot starts and the payment deadline (`hold_expires_at`) never moves later; bookings with any cash or credit in can move only 24h+ before the current slot (the 100% cancel tier, so moving can't dodge late-cancel tiers). A cheaper new slot returns the difference as credit only out of `credit_applied`; if the excess would come out of cash, it's refused ("WhatsApp us"). Every move appends a line to `admin_note` and emails the customer (`sendBookingRescheduled`). Slot rules are shared with new bookings via `lib/booking-slot.ts` — change them there, not inline.
- **Manage page** (`/booking/manage/[token]`) shows the payment panel (bank details with copy buttons, amount, hold deadline, WhatsApp) whenever money is owed, plus Change time / Cancel / Apply credit. The account page's booking rows link to it (dashboard returns `cancel_token` for the owner's own bookings). Navbar has "My Bookings" → `/account#bookings`.
- **Login keeps the picked slot.** Booking page login/signup links carry `next=/booking?date=…&court=…&t=HHMM&dur=…` through the magic link (`lib/next-path.ts` validates it; times are `HHMM` because `:` isn't allowed in `next`), and the booking page re-selects that slot once slots load.
- **WhatsApp community** link is `WHATSAPP_COMMUNITY_LINK` in lib/constants.ts (hero "Join Our Community"). `WHATSAPP_LINK` stays the official number for payments/support.

