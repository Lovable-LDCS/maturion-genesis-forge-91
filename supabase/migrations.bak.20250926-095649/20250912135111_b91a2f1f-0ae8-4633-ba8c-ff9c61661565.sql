-- Organization Web Ingestion Tables
-- RLS: Service role can write, organization members can read their org's data

-- Organization domains to crawl
CREATE TABLE public.org_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  crawl_depth INTEGER NOT NULL DEFAULT 2,
  recrawl_hours INTEGER NOT NULL DEFAULT 168, -- Weekly by default
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  updated_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  UNIQUE(org_id, domain)
);

-- Crawl queue for managing URL fetching
CREATE TYPE crawl_status AS ENUM ('queued', 'fetching', 'done', 'failed');

CREATE TABLE public.org_crawl_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  status crawl_status NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  INDEX(org_id, status, priority DESC),
  INDEX(org_id, url)
);

-- Crawled pages storage
CREATE TABLE public.org_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  title TEXT,
  text TEXT, -- Clean extracted text
  html_hash TEXT, -- For deduplication
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  etag TEXT, -- HTTP ETag for caching
  content_type TEXT,
  robots_index BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, url),
  INDEX(org_id, domain),
  INDEX(org_id, fetched_at),
  INDEX(html_hash)
);

-- Page content chunks with embeddings
CREATE TABLE public.org_page_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.org_pages(id) ON DELETE CASCADE,
  chunk_idx INTEGER NOT NULL,
  text TEXT NOT NULL,
  tokens INTEGER,
  embedding VECTOR(1536), -- OpenAI ada-002 dimensions
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_id, chunk_idx),
  INDEX(org_id, created_at)
);

-- Ingestion job tracking
CREATE TYPE ingest_job_status AS ENUM ('running', 'completed', 'failed', 'cancelled');

CREATE TABLE public.org_ingest_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  status ingest_job_status NOT NULL DEFAULT 'running',
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  INDEX(org_id, status),
  INDEX(org_id, started_at)
);

-- Enable RLS on all tables
ALTER TABLE public.org_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_crawl_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_page_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_ingest_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role can write, org members can read their org's data

-- org_domains policies
CREATE POLICY "Service role can manage org domains" ON public.org_domains
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Organization members can view their org domains" ON public.org_domains
  FOR SELECT USING (user_can_view_organization(org_id));

-- org_crawl_queue policies  
CREATE POLICY "Service role can manage crawl queue" ON public.org_crawl_queue
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Organization members can view their org crawl queue" ON public.org_crawl_queue
  FOR SELECT USING (user_can_view_organization(org_id));

-- org_pages policies
CREATE POLICY "Service role can manage org pages" ON public.org_pages
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Organization members can view their org pages" ON public.org_pages
  FOR SELECT USING (user_can_view_organization(org_id));

-- org_page_chunks policies
CREATE POLICY "Service role can manage org page chunks" ON public.org_page_chunks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Organization members can view their org page chunks" ON public.org_page_chunks
  FOR SELECT USING (user_can_view_organization(org_id));

-- org_ingest_jobs policies
CREATE POLICY "Service role can manage org ingest jobs" ON public.org_ingest_jobs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Organization members can view their org ingest jobs" ON public.org_ingest_jobs
  FOR SELECT USING (user_can_view_organization(org_id));

-- Seed De Beers domains (when org exists)
-- This will be populated by the domain management interface

-- Create indexes for vector similarity search
CREATE INDEX ON public.org_page_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Trigger for updating updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_org_domains()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_domains_updated_at
  BEFORE UPDATE ON public.org_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_org_domains();

-- Audit trail triggers
CREATE TRIGGER log_org_domains_audit_trail
  AFTER INSERT OR UPDATE OR DELETE ON public.org_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER log_org_crawl_queue_audit_trail
  AFTER INSERT OR UPDATE OR DELETE ON public.org_crawl_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER log_org_pages_audit_trail
  AFTER INSERT OR UPDATE OR DELETE ON public.org_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER log_org_ingest_jobs_audit_trail
  AFTER INSERT OR UPDATE OR DELETE ON public.org_ingest_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_trail();