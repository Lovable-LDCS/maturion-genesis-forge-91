-- Lock down the update_org_doc_status RPC to service role only
revoke all on function update_org_doc_status(uuid, doc_status, text, int) from public, authenticated, anon;
grant execute on function update_org_doc_status(uuid, doc_status, text, int) to service_role;

-- Optimize the path trigger function (remove unnecessary SECURITY DEFINER)
create or replace function enforce_org_doc_path()
returns trigger language plpgsql as $$
begin
  if new.source_object_path !~ '^org/[0-9a-fA-F-]+/inbox/' then
    raise exception 'Invalid document path: %', new.source_object_path;
  end if;
  return new;
end $$;