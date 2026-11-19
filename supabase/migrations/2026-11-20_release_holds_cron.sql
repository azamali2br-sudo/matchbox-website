-- Release lapsed 30-minute payment holds every 5 minutes.
--
-- Vercel Hobby crons run at most once a day, so Supabase's pg_cron calls the
-- site's /api/cron/release-holds endpoint instead (via pg_net). The endpoint
-- cancels unpaid bookings past their hold, returns any applied credit and sends
-- the "expired" email — all logic stays in lib/holds.ts.
--
-- Run once in the Supabase SQL Editor, project MBX (ref ilremifudktcbwkmtmbg).
-- Safe to re-run: cron.schedule with the same job name replaces the job.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'release-lapsed-holds',
  '*/5 * * * *',
  $$ select net.http_get(
       url := 'https://www.matchboxpadel.com/api/cron/release-holds',
       timeout_milliseconds := 20000
     ) $$
);

-- Check it (should list the job):
--   select jobid, jobname, schedule, active from cron.job;
-- Recent runs / responses:
--   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
--   select status_code, content, created from net._http_response order by created desc limit 5;
-- Remove it:
--   select cron.unschedule('release-lapsed-holds');
