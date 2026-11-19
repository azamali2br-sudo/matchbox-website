@AGENTS.md

# Removing an approved Match IQ match (duplicate / wrong entry)

Learned 2026-09-13 and 2026-09-22 — two approved matches had to be removed by hand.

**Facts that make this safe:**
- Leaderboard, profiles, rating graphs and season standings are all **replayed from `matches` where `status = 'approved'`** (`lib/leaderboard.ts`, `lib/seasons.ts`, ordered by `played_on`, `start_time`, `created_at`). Nothing reads `players.rating/wins/losses` or `rating_history` for display — those columns are legacy write-only side effects of the approve handler.
- So the fix is **`status = 'rejected'`** on the bad row. Never delete rows, never touch `rating_history` or `players`. Ratings recompute on next page load.
- A **closed month** (row in `match_iq_seasons`) is frozen — reject would change a final board; reopen the season from the admin page first.

**Why SQL is needed:** the admin dashboard (`app/admin/AdminClient.tsx`) only lists *pending* matches, and `PATCH /api/match-iq/matches/[id]` has no "unapprove". Once approved, a match is only removable via the Supabase SQL Editor. Claude Code cannot run scripts against prod with the service key from this machine (auto-mode classifier blocks it) — hand Azam SQL to paste instead. Template: [supabase/fixes/2026-09-13_reject_duplicate_match.sql](supabase/fixes/2026-09-13_reject_duplicate_match.sql).

**Procedure (Azam runs in Supabase SQL Editor, project MBX / ref `ilremifudktcbwkmtmbg` only):**
1. Prefer a single `update … returning id, played_on, start_time, status` so the editor shows the changed row. Multi-statement pastes only display the first result set — a preceding `select` masks whether the `update` ran.
2. Match the row by `played_on`, `court`, `start_time like 'HH:MM%'`, `status = 'approved'`, and a 4-name `ilike` count subquery over `team1_p1..team2_p2` — avoids needing UUIDs.
3. Expect exactly 1 row back. 0 rows = names/time didn't match; re-check with a select.

**Which duplicate to keep:** compare `created_at`. A copy created minutes after a plausible evening slot is the real one; an AM copy with a same-night `created_at` is the AM/PM typo (5 Sept case: 09:30 copy was created 22:46 that night → rejected it, kept 21:30). Set scores are usually NULL on both, so don't use that as the tiebreaker.

**Records:**
- 2026-09-05 Box A — Fahad Sheikh Muhammad + Khizer Bin Saad bt Habib Junaid + Hammad Ali 2-0, entered twice; rejected `6c356195-a3c3-4b7b-9eeb-206fdd968b9d` (09:30 copy) on 2026-09-13.
- 2026-09-07 Box A 23:00 — Syed Muhammad Saad Sarfraz + Mujtaba Irfan vs Zuhayr + Waqas Shahid, wrong match; rejected on 2026-09-22.

**Open follow-up:** add an "Undo approval" action (set `status = 'rejected'` on an approved match, blocked for closed months) to the admin dashboard so this stops needing SQL. Offered to Azam twice, not yet requested.
