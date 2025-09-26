-- Add shadow column and sync trigger to fix audit trail errors
BEGIN;

-- Add shadow column
ALTER TABLE public.org_domains
  ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Sync trigger function
CREATE OR REPLACE FUNCTION public.org_domains_sync_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.organization_id := NEW.org_id;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_org_domains_sync_org_id ON public.org_domains;

-- Create trigger
CREATE TRIGGER trg_org_domains_sync_org_id
BEFORE INSERT OR UPDATE ON public.org_domains
FOR EACH ROW
EXECUTE FUNCTION public.org_domains_sync_org_id();

-- Backfill existing data
UPDATE public.org_domains
SET organization_id = org_id
WHERE organization_id IS NULL;

-- Re-seed De Beers domains
DELETE FROM public.org_domains 
WHERE org_id = 'e443d914-8756-4b29-9599-6a59230b87f3';

INSERT INTO public.org_domains (org_id, domain, is_enabled, recrawl_hours, crawl_depth, created_by, updated_by)
VALUES 
  ('e443d914-8756-4b29-9599-6a59230b87f3', 'debeersgroup.com', true, 24, 2, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('e443d914-8756-4b29-9599-6a59230b87f3', 'debeers.com', true, 24, 2, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('e443d914-8756-4b29-9599-6a59230b87f3', 'forevermark.com', true, 24, 2, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('e443d914-8756-4b29-9599-6a59230b87f3', 'ndtc.com.na', true, 24, 2, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

COMMIT;