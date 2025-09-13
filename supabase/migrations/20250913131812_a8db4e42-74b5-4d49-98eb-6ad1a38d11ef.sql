-- Remove existing job if present
SELECT cron.unschedule('nightly-org-crawl')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nightly-org-crawl');

-- Create secure nightly crawl cron job
-- The edge function will validate the x-cron-key header against CRON_KEY secret
SELECT cron.schedule(
  'nightly-org-crawl',
  '0 2 * * *', -- Run at 2 AM daily
  $$
  SELECT net.http_post(
    url := 'https://dmhlxhatogrrrvuruayv.supabase.co/functions/v1/schedule-nightly-crawl',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-key', 'maturion-cron-2025-secure-key-e9f8d7c6b5a4938271605fde4cb2ae1b'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);