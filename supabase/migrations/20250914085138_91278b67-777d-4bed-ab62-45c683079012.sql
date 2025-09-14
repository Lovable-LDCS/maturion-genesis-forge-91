BEGIN;

-- 1) Generated shadow column (no trigger)
ALTER TABLE public.org_domains
  ADD COLUMN IF NOT EXISTS organization_id uuid GENERATED ALWAYS AS (org_id) STORED;
ALTER TABLE public.org_domains
  ALTER COLUMN organization_id SET NOT NULL;

-- 2) Lookup index
CREATE INDEX IF NOT EXISTS idx_org_domains_organization_id
  ON public.org_domains (organization_id);

-- 3) (Optional) FK (only if all org_ids exist in organizations)
-- ALTER TABLE public.org_domains
--   ADD CONSTRAINT org_domains_org_fk
--   FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- 4) Create unique index for UPSERT constraint (outside transaction would be ideal but including here)
CREATE UNIQUE INDEX IF NOT EXISTS org_domains_org_id_domain_uidx
  ON public.org_domains (org_id, domain);

-- 5) Upsert De Beers domains (keeps audit history)
INSERT INTO public.org_domains (org_id, domain, is_enabled, recrawl_hours, crawl_depth, created_by, updated_by)
VALUES 
  ('e443d914-8756-4b29-9599-6a59230b87f3','debeersgroup.com', true, 24, 2, '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001'),
  ('e443d914-8756-4b29-9599-6a59230b87f3','debeers.com',       true, 24, 2, '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001'),
  ('e443d914-8756-4b29-9599-6a59230b87f3','forevermark.com',   true, 24, 2, '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001'),
  ('e443d914-8756-4b29-9599-6a59230b87f3','ndtc.com.na',       true, 24, 2, '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001')
ON CONFLICT (org_id, domain) DO UPDATE
SET is_enabled    = EXCLUDED.is_enabled,
    recrawl_hours = EXCLUDED.recrawl_hours,
    crawl_depth   = EXCLUDED.crawl_depth,
    updated_by    = EXCLUDED.updated_by,
    updated_at    = NOW();

COMMIT;