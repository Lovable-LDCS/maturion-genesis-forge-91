-- Seed De Beers domains
INSERT INTO public.org_domains (org_id, domain, is_enabled, recrawl_hours, crawl_depth)
VALUES
('e443d914-8756-4b29-9599-6a59230b87f3', 'debeersgroup.com', true, 24, 2),
('e443d914-8756-4b29-9599-6a59230b87f3', 'debeers.com', true, 24, 2),
('e443d914-8756-4b29-9599-6a59230b87f3', 'forevermark.com', true, 24, 2),
('e443d914-8756-4b29-9599-6a59230b87f3', 'ndtc.com.na', true, 24, 2)
ON CONFLICT (org_id, domain) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  recrawl_hours = EXCLUDED.recrawl_hours,
  crawl_depth = EXCLUDED.crawl_depth;