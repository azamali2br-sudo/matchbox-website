-- Reject the duplicate Match IQ entry from 5 Sept 2026 (Box A).
-- Same match entered twice: Fahad Sheikh Muhammad + Khizer Bin Saad beat
-- Habib Junaid + Hammad Ali 2-0. One copy is at 21:30, the other at 09:30.
-- This keeps the 09:30 copy (it has set scores) and rejects the 21:30 copy.
-- To keep the other one instead, swap '21:30' for '09:30' in step 2.
--
-- Run in Supabase SQL Editor, project ref ilremifudktcbwkmtmbg ONLY.
-- Leaderboard, profiles and rating graphs are replayed from approved matches,
-- so status = 'rejected' is all that is needed. Nothing is deleted.

-- Step 1: look. Expect exactly 2 rows, both status = 'approved'.
select m.id, m.played_on, m.start_time, m.court, m.status, m.set_scores, m.created_at,
       a.name as t1_p1, b.name as t1_p2, c.name as t2_p1, d.name as t2_p2,
       m.team1_score, m.team2_score
from matches m
join players a on a.id = m.team1_p1
join players b on b.id = m.team1_p2
join players c on c.id = m.team2_p1
join players d on d.id = m.team2_p2
where m.played_on = '2026-09-05'
  and m.court = 'A'
  and (select count(*) from players p
       where p.id in (m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2)
         and (p.name ilike 'Habib Junaid%' or p.name ilike 'Hammad Ali%'
              or p.name ilike 'Fahad Sheikh%' or p.name ilike 'Khizer Bin Saad%')) = 4
order by m.start_time;

-- Step 2: reject the 21:30 copy. Should report "UPDATE 1".
update matches m
set status = 'rejected'
where m.played_on = '2026-09-05'
  and m.court = 'A'
  and m.start_time like '21:30%'
  and m.status = 'approved'
  and (select count(*) from players p
       where p.id in (m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2)
         and (p.name ilike 'Habib Junaid%' or p.name ilike 'Hammad Ali%'
              or p.name ilike 'Fahad Sheikh%' or p.name ilike 'Khizer Bin Saad%')) = 4;

-- Step 3: re-run Step 1. Expect one 'approved' (09:30) and one 'rejected' (21:30).
