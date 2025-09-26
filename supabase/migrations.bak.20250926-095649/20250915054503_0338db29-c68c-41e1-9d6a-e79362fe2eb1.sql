-- Drop the broad policy that doesn't work properly for INSERTs
drop policy if exists "Users can access their organization's documents" on organization_documents;

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

-- Performance index for recent activity
create index if not exists idx_org_docs_org_created_at on organization_documents(org_id, created_at desc);