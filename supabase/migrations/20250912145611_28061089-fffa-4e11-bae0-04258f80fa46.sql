-- Enable cron extension and create scheduled crawl job
SELECT cron.schedule(
  'nightly-org-crawl',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT net.http_post(
    url := 'https://dmhlxhatogrrrvuruayv.supabase.co/functions/v1/crawl-org-domain',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtaGx4aGF0b2dycnJ2dXJ1YXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTQwODMsImV4cCI6MjA2ODE3MDA4M30.uBMegZGwmf8CfVqdzrT3gTSV4kcJCoQxDDra-Qd4-b0"}'::jsonb,
    body := json_build_object(
      'orgId', org_id,
      'scheduledCrawl', true
    )::jsonb
  ) AS request_id
  FROM (
    SELECT DISTINCT org_id 
    FROM org_domains 
    WHERE is_enabled = true 
      AND (
        fetched_at IS NULL 
        OR fetched_at + (recrawl_hours * INTERVAL '1 hour') < NOW()
      )
  ) domains;
  $$
);

-- Create org_profiles table for logo persistence if it doesn't exist
CREATE TABLE IF NOT EXISTS org_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  accent_color TEXT DEFAULT '#8b5cf6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(org_id)
);

-- Enable RLS on org_profiles
ALTER TABLE org_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for org_profiles
CREATE POLICY "Users can manage their organization profile" 
ON org_profiles 
FOR ALL 
USING (org_id IN (
  SELECT om.organization_id 
  FROM organization_members om 
  WHERE om.user_id = auth.uid()
))
WITH CHECK (org_id IN (
  SELECT om.organization_id 
  FROM organization_members om 
  WHERE om.user_id = auth.uid() 
    AND om.role IN ('admin', 'owner')
));

-- Add trigger for updated_at
CREATE TRIGGER update_org_profiles_updated_at
  BEFORE UPDATE ON org_profiles
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();