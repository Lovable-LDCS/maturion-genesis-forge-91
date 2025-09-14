-- Add unique constraint on org_crawl_queue to prevent duplicate URLs per org
ALTER TABLE public.org_crawl_queue 
ADD CONSTRAINT org_crawl_queue_unique 
UNIQUE (org_id, url);

-- Add index for efficient crawl queue processing
CREATE INDEX IF NOT EXISTS idx_org_crawl_queue_org_status_priority 
ON public.org_crawl_queue (org_id, status, priority DESC);