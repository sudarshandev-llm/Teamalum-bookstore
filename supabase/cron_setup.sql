-- ============================================================
-- Team Alum Bookstore — Auto-Expiry Cron Job Setup
-- Run this separately after the main migration is pushed.
-- Recommended: Run in Supabase SQL Editor (Dashboard → SQL Editor).
-- Alternatively: call the Management API SQL endpoint
--   POST https://api.supabase.com/v1/projects/<project-ref>/database/query
--   Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
--
-- Requires: pg_cron extension enabled on the Supabase project.
-- To enable pg_cron: Dashboard → Database → Extensions → find
-- "pg_cron" and click Enable, then run this SQL in the SQL Editor.
-- ============================================================

-- 1. Ensure pg_cron is enabled (idempotent)
create extension if not exists pg_cron;

-- 2. Schedule the daily expiry job (idempotent via cron.schedule)
--    Runs every day at 00:05 UTC. cron.schedule upserts by job name,
--    so re-running this script will not create duplicate jobs.
select cron.schedule(
  'bookstore-daily-expire',
  '5 0 * * *',
  'select public.expire_subscriptions();'
);

-- Verify
select jobid, schedule, command, jobname, active from cron.job where jobname = 'bookstore-daily-expire';