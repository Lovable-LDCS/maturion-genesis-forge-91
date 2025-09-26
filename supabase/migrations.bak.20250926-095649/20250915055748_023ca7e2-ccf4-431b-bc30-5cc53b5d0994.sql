-- 1. Create enum type for status (strong typing, no typos)
do $$ begin
  create type doc_status as enum ('pending','ready','failed');
exception when duplicate_object then null; end $$;

-- 2. Update the status column to use the enum
alter table organization_documents
  alter column status type doc_status
  using status::doc_status;

-- 3. Add path normalization validation trigger
create or replace function enforce_org_doc_path()
returns trigger language plpgsql as $$
begin
  if new.source_object_path !~ '^org/[0-9a-fA-F-]+/inbox/' then
    raise exception 'Invalid document path: %', new.source_object_path;
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_org_doc_path on organization_documents;
create trigger trg_enforce_org_doc_path
before insert or update on organization_documents
for each row execute function enforce_org_doc_path();

-- 4. Create security definer RPC for status updates
create or replace function update_org_doc_status(
  p_doc_id uuid,
  p_status doc_status,
  p_error text default null,
  p_pages int default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update organization_documents
  set status = p_status,
      error_text = p_error,
      pages = coalesce(pages, p_pages),
      processed_at = now()
  where id = p_doc_id;
$$;

-- 5. Lock down RPC to service role only
revoke all on function update_org_doc_status(uuid, doc_status, text, int) from public, authenticated, anon;
grant execute on function update_org_doc_status(uuid, doc_status, text, int) to service_role;

-- 6. Add performance index for pending queue polling
create index if not exists idx_org_docs_pending
on organization_documents(org_id, status)
where status = 'pending';