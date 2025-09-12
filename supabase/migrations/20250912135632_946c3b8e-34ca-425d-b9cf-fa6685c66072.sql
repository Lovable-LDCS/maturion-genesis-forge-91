-- Enable pgvector (idempotent)
create extension if not exists vector;

-- ---------- ENUMS (create if missing) ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'crawl_status') then
    create type crawl_status as enum ('queued','fetching','done','failed');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ingest_job_status') then
    create type ingest_job_status as enum ('running','completed','failed','cancelled');
  end if;
end$$;

-- ---------- TABLES ----------
create table if not exists public.org_domains (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  domain text not null,                                 -- store bare domain (no scheme)
  crawl_depth int not null default 2,
  recrawl_hours int not null default 168,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default '00000000-0000-0000-0000-000000000000',
  updated_by uuid not null default '00000000-0000-0000-0000-000000000000',
  constraint org_domains_unique unique (org_id, domain)
);

create table if not exists public.org_crawl_queue (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  url text not null,
  priority int not null default 100,
  status crawl_status not null default 'queued',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.org_pages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  url text not null,
  domain text not null,
  title text,
  text text,                 -- extracted clean text
  html_hash text,            -- dedupe key
  fetched_at timestamptz not null default now(),
  etag text,
  content_type text,
  robots_index boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_pages_unique unique (org_id, url)
);

create table if not exists public.org_page_chunks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  page_id uuid not null references public.org_pages(id) on delete cascade,
  chunk_idx int not null,
  text text not null,
  tokens int,
  embedding vector(1536),    -- adjust if you embed with a larger-dim model
  created_at timestamptz not null default now(),
  constraint org_page_chunks_unique unique (page_id, chunk_idx)
);

create table if not exists public.org_ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status ingest_job_status not null default 'running',
  stats jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- INDEXES ----------
create index if not exists idx_org_crawl_queue_org_status_pri
  on public.org_crawl_queue (org_id, status, priority desc);

create index if not exists idx_org_crawl_queue_org_url
  on public.org_crawl_queue (org_id, url);

create index if not exists idx_org_pages_org_domain
  on public.org_pages (org_id, domain);

create index if not exists idx_org_pages_org_fetched_at
  on public.org_pages (org_id, fetched_at);

create index if not exists idx_org_pages_html_hash
  on public.org_pages (html_hash);

create index if not exists idx_org_page_chunks_org_created
  on public.org_page_chunks (org_id, created_at);

-- Vector similarity index (requires pgvector)
create index if not exists idx_org_page_chunks_embedding
  on public.org_page_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ---------- RLS ----------
alter table public.org_domains      enable row level security;
alter table public.org_crawl_queue  enable row level security;
alter table public.org_pages        enable row level security;
alter table public.org_page_chunks  enable row level security;
alter table public.org_ingest_jobs  enable row level security;

-- NOTE: In Supabase the service role bypasses RLS, so we only define READ policies for members.
-- Replace user_can_view_organization(org_id) with your existing helper; otherwise see stub below.

-- READ for org members
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='org_domains' and policyname='org_members_read_org_domains'
  ) then
    create policy "org_members_read_org_domains"
      on public.org_domains for select
      using (user_can_view_organization(org_id));
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='org_crawl_queue' and policyname='org_members_read_crawl_queue'
  ) then
    create policy "org_members_read_crawl_queue"
      on public.org_crawl_queue for select
      using (user_can_view_organization(org_id));
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='org_pages' and policyname='org_members_read_pages'
  ) then
    create policy "org_members_read_pages"
      on public.org_pages for select
      using (user_can_view_organization(org_id));
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='org_page_chunks' and policyname='org_members_read_page_chunks'
  ) then
    create policy "org_members_read_page_chunks"
      on public.org_page_chunks for select
      using (user_can_view_organization(org_id));
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='org_ingest_jobs' and policyname='org_members_read_ingest_jobs'
  ) then
    create policy "org_members_read_ingest_jobs"
      on public.org_ingest_jobs for select
      using (user_can_view_organization(org_id));
  end if;
end$$;

-- No INSERT/UPDATE/DELETE policies are added on purpose.
-- Edge functions using the service key will bypass RLS to write these tables.

-- ---------- Triggers (updated_at) ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_touch_org_domains on public.org_domains;
create trigger trg_touch_org_domains
  before update on public.org_domains
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_org_crawl_queue on public.org_crawl_queue;
create trigger trg_touch_org_crawl_queue
  before update on public.org_crawl_queue
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_org_pages on public.org_pages;
create trigger trg_touch_org_pages
  before update on public.org_pages
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_org_ingest_jobs on public.org_ingest_jobs;
create trigger trg_touch_org_ingest_jobs
  before update on public.org_ingest_jobs
  for each row execute function public.touch_updated_at();

-- ---------- Audit triggers ----------
create trigger log_org_domains_audit_trail
  after insert or update or delete on public.org_domains
  for each row execute function public.log_audit_trail();

create trigger log_org_crawl_queue_audit_trail
  after insert or update or delete on public.org_crawl_queue
  for each row execute function public.log_audit_trail();

create trigger log_org_pages_audit_trail
  after insert or update or delete on public.org_pages
  for each row execute function public.log_audit_trail();

create trigger log_org_ingest_jobs_audit_trail
  after insert or update or delete on public.org_ingest_jobs
  for each row execute function public.log_audit_trail();