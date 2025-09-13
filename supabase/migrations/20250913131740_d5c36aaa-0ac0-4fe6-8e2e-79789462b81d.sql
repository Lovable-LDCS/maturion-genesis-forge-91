-- Store a secret in DB settings (admin only) - generate a long random value
ALTER DATABASE postgres SET app.cron_key = 'maturion-cron-2025-secure-key-e9f8d7c6b5a4938271605fde4cb2ae1b';

-- Remove existing job if present
SELECT cron.unschedule('nightly-org-crawl')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nightly-org-crawl');

-- Secure schedule: inject x-cron-key from DB setting at runtime
SELECT cron.schedule(
  'nightly-org-crawl',
  '0 2 * * *', -- Run at 2 AM daily
  $$
  SELECT net.http_post(
    url := 'https://dmhlxhatogrrrvuruayv.supabase.co/functions/v1/schedule-nightly-crawl',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-key', current_setting('app.cron_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);