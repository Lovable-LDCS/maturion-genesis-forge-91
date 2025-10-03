-- up
-- Purpose: Ensure audit delete triggers never fail when organization_id is NULL.
-- We add safe AFTER DELETE triggers on MPS and criteria that insert into audit_trail
-- using COALESCE(OLD.organization_id, SYSTEM_USER_ID). If audit_trail does not exist,
-- the trigger is a no-op (defensive), so it won't block deletes.

-- Constants
do $$ begin
  if not exists (
    select 1 from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'uuid' and n.nspname = 'pg_catalog'
  ) then
    raise notice 'uuid type must exist (it does in Postgres)';
  end if;
end $$;

-- Helper function: returns the system user UUID used throughout the app
create or replace function public.system_user_uuid()
returns uuid language sql as $$
  select '00000000-0000-0000-0000-000000000001'::uuid;
$$;

-- Safe audit logger for DELETE that coalesces organization_id and swallows errors if audit_trail is missing
create or replace function public.safe_audit_delete()
returns trigger
language plpgsql
as $$
begin
  -- If an audit_trail table exists with expected columns, try to log; otherwise no-op
  begin
    perform 1 from information_schema.tables where table_schema = 'public' and table_name = 'audit_trail';
    if found then
      -- Try to insert; if columns differ, swallow and continue
      begin
        insert into public.audit_trail (
          table_name,
          record_id,
          action,
          organization_id,
          occurred_at,
          actor_id,
          data
        ) values (
          TG_TABLE_NAME,
          coalesce((to_jsonb(OLD)->>'id')::uuid, gen_random_uuid()),
          'DELETE',
          coalesce((to_jsonb(OLD)->>'organization_id')::uuid, public.system_user_uuid()),
          now(),
          public.system_user_uuid(),
          to_jsonb(OLD)
        );
      exception when undefined_column then
        -- Fallback: attempt minimal insert variant if schema differs
        begin
          insert into public.audit_trail (
            table_name,
            record_id,
            action,
            organization_id,
            occurred_at
          ) values (
            TG_TABLE_NAME,
            coalesce((to_jsonb(OLD)->>'id')::uuid, gen_random_uuid()),
            'DELETE',
            coalesce((to_jsonb(OLD)->>'organization_id')::uuid, public.system_user_uuid()),
            now()
          );
        exception when others then
          -- Final fallback: ignore all errors to avoid blocking delete
          null;
        end;
      when others then
        -- Any other error in inserting to audit trail should not block delete
        null;
      end;
    end if;
  exception when others then
    -- If table existence check fails for any reason, ignore
    null;
  end;
  return null; -- AFTER DELETE: return value is ignored
end;
$$;

-- Replace/ensure triggers on criteria and maturity_practice_statements
-- We use distinct names to avoid conflict; dropping if they exist first

-- Criteria
drop trigger if exists trg_criteria_delete_audit_fix on public.criteria;
create trigger trg_criteria_delete_audit_fix
after delete on public.criteria
for each row execute function public.safe_audit_delete();

-- MPS
drop trigger if exists trg_mps_delete_audit_fix on public.maturity_practice_statements;
create trigger trg_mps_delete_audit_fix
after delete on public.maturity_practice_statements
for each row execute function public.safe_audit_delete();

-- down
-- Remove triggers and helper functions created in this migration
-- Note: Only drops what we created; legacy audit triggers (if any) remain untouched

-- Down: drop triggers
drop trigger if exists trg_mps_delete_audit_fix on public.maturity_practice_statements;
drop trigger if exists trg_criteria_delete_audit_fix on public.criteria;

-- Down: drop functions
drop function if exists public.safe_audit_delete();
drop function if exists public.system_user_uuid();
