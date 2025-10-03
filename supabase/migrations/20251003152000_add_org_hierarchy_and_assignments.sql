-- up
-- Organization hierarchy and scoped assignments foundation

create table if not exists public.organization_hierarchy (
  id uuid primary key default gen_random_uuid(),
  parent_org_id uuid not null references public.organizations(id) on delete cascade,
  child_org_id uuid not null references public.organizations(id) on delete cascade,
  relationship_type text not null default 'subsidiary',
  created_at timestamptz not null default now(),
  created_by uuid not null default '00000000-0000-0000-0000-000000000001',
  unique (parent_org_id, child_org_id)
);

comment on table public.organization_hierarchy is 'Relates parent organizations to child/subsidiaries for inherited access and rollups';

-- Evidence assignment scoping by org and target (domain/mps/criteria)
create table if not exists public.evidence_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  domain_id uuid null references public.domains(id) on delete cascade,
  mps_id uuid null references public.maturity_practice_statements(id) on delete cascade,
  criteria_id uuid null references public.criteria(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid not null default '00000000-0000-0000-0000-000000000001',
  constraint evidence_assignments_target_chk check (
    (domain_id is not null)::int + (mps_id is not null)::int + (criteria_id is not null)::int = 1
  ),
  unique (organization_id, user_id, domain_id, mps_id, criteria_id)
);

comment on table public.evidence_assignments is 'Scopes evidence collectors to a specific domain OR MPS OR criteria within an organization';

-- Minimal grants (service_role already covered elsewhere); allow read to authenticated for now (RLS to be added)
grant select, insert, update, delete on table public.organization_hierarchy to service_role;
grant select, insert, update, delete on table public.evidence_assignments to service_role;

grant select on table public.organization_hierarchy to authenticated;
grant select on table public.evidence_assignments to authenticated;

-- down
drop table if exists public.evidence_assignments;
drop table if exists public.organization_hierarchy;
