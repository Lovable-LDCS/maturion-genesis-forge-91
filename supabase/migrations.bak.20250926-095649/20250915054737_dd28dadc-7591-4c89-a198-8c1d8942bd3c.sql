-- Create organization_documents table
create table if not exists organization_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  source_object_path text not null,              -- storage path
  mime_type text,
  status text not null default 'pending',        -- 'pending' | 'ready' | 'failed'
  error_text text,
  pages int,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table organization_documents enable row level security;

-- Create indexes
create index if not exists idx_org_docs_org_status on organization_documents(org_id, status);
create index if not exists idx_org_docs_org_created_at on organization_documents(org_id, created_at desc);

-- SELECT: any org member can view rows for their org
create policy "org_docs_select_member"
on organization_documents
for select
using (
  org_id in (
    select organization_id
    from organization_members
    where user_id = auth.uid()
  )
);

-- INSERT: only admins/owners can create rows (enqueue uploads, etc.)
create policy "org_docs_insert_admin"
on organization_documents
for insert
with check (
  org_id in (
    select organization_id
    from organization_members
    where user_id = auth.uid()
      and role = any (array['admin','owner'])
  )
);

-- UPDATE: only admins/owners can update status/error/pages, etc.
create policy "org_docs_update_admin"
on organization_documents
for update
using (
  org_id in (
    select organization_id
    from organization_members
    where user_id = auth.uid()
      and role = any (array['admin','owner'])
  )
)
with check (
  org_id in (
    select organization_id
    from organization_members
    where user_id = auth.uid()
      and role = any (array['admin','owner'])
  )
);

-- DELETE: only admins/owners can delete rows
create policy "org_docs_delete_admin"
on organization_documents
for delete
using (
  org_id in (
    select organization_id
    from organization_members
    where user_id = auth.uid()
      and role = any (array['admin','owner'])
  )
);