-- Step 2 after deploying the `market` edge function: run it every minute.
-- Each run refreshes prices, fills and expires orders, ends finished games, and takes closing snapshots.
-- When the market is closed it returns in milliseconds, so running every minute all day is cheap
-- (about 43,000 calls a month; the free plan includes 500,000).
--
-- Before running:
--   1. Replace YOUR-PROJECT-REF with your project reference (Settings > General).
--   2. Replace YOUR-CRON-SECRET with the same value you saved as the CRON_SECRET function secret.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select vault.create_secret('https://YOUR-PROJECT-REF.supabase.co', 'market_project_url');
select vault.create_secret('YOUR-CRON-SECRET', 'market_cron_secret');

select cron.schedule(
  'market-refresh',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'market_project_url') || '/functions/v1/market',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'market_cron_secret')
    ),
    body := '{"action":"refresh"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Weekly symbol list refresh (Sunday 6:15 a.m. UTC) so newly listed companies become searchable.
select cron.schedule(
  'market-sync-symbols',
  '15 6 * * 0',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'market_project_url') || '/functions/v1/market',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'market_cron_secret')
    ),
    body := '{"action":"sync"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Optional housekeeping: remove anonymous sign-ins whose player has been inactive for 60 days.
-- Activity comes from the app (trades, lessons, visits), so students in a long game are never
-- signed out mid-season. Players keep their data and can rejoin with their PIN.
select cron.schedule(
  'cleanup-anonymous-users',
  '30 6 * * *',
  $$
  delete from auth.users u
  where u.is_anonymous
    and u.created_at < now() - interval '60 days'
    and not exists (
      select 1 from public.players p
      where p.user_id = u.id
        and coalesce(p.last_active_at, p.created_at) > now() - interval '60 days'
    );
  $$
);

-- Check it is working:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 10;
--   select * from public.app_status;
-- To stop:  select cron.unschedule('market-refresh');
