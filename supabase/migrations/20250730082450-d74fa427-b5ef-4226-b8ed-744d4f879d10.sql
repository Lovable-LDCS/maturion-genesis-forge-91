-- Create cron job to run QA cycle every 12 hours
SELECT cron.schedule(
  'automated-qa-cycle',
  '0 */12 * * *', -- Every 12 hours at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://dmhlxhatogrrrvuruayv.supabase.co/functions/v1/run-full-qa-cycle',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtaGx4aGF0b2dycnJ2dXJ1YXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTQwODMsImV4cCI6MjA2ODE3MDA4M30.uBMegZGwmf8CfVqdzrT3gTSV4kcJCoQxDDra-Qd4-b0"}'::jsonb,
        body:='{"scheduled": true, "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);