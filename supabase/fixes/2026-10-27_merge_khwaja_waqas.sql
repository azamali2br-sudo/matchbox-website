-- Merge the duplicate Khwaja Waqas Match IQ profile into his main one, then
-- delete the duplicate.
--   KEEP   d6351b95-27b1-4c5e-816d-5f8e5a4cad59  +923452083354  (since 6 Jun, ~50 matches)
--   DELETE 53bea686-2c48-483e-9241-54727cac0eb4  +923052614891  (created 24 Aug, 2 approved + 1 rejected)
-- The duplicate's matches were all played with his usual partner, so they are
-- his real results: they move to the main profile instead of being dropped
-- (dropping them would also change the ratings of the other players in them).
--
-- Run in Supabase SQL Editor, project ref ilremifudktcbwkmtmbg ONLY.
-- One statement, so the editor shows its result. Expect one row:
--   matches_moved = 3, history_moved = 2, deleted_name = 'Khwaja Waqas'
-- If deleted_name is NULL nothing matched — re-check the ids.

with
t1p1 as (update matches set team1_p1 = 'd6351b95-27b1-4c5e-816d-5f8e5a4cad59' where team1_p1 = '53bea686-2c48-483e-9241-54727cac0eb4' returning id),
t1p2 as (update matches set team1_p2 = 'd6351b95-27b1-4c5e-816d-5f8e5a4cad59' where team1_p2 = '53bea686-2c48-483e-9241-54727cac0eb4' returning id),
t2p1 as (update matches set team2_p1 = 'd6351b95-27b1-4c5e-816d-5f8e5a4cad59' where team2_p1 = '53bea686-2c48-483e-9241-54727cac0eb4' returning id),
t2p2 as (update matches set team2_p2 = 'd6351b95-27b1-4c5e-816d-5f8e5a4cad59' where team2_p2 = '53bea686-2c48-483e-9241-54727cac0eb4' returning id),
hist as (update rating_history set player_id = 'd6351b95-27b1-4c5e-816d-5f8e5a4cad59' where player_id = '53bea686-2c48-483e-9241-54727cac0eb4' returning id),
del as (delete from players where id = '53bea686-2c48-483e-9241-54727cac0eb4' and phone = '+923052614891' returning name)
select
  (select count(*) from t1p1) + (select count(*) from t1p2) + (select count(*) from t2p1) + (select count(*) from t2p2) as matches_moved,
  (select count(*) from hist) as history_moved,
  (select name from del) as deleted_name;
