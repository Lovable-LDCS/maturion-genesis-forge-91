-- up
create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_key text not null, -- e.g., main_admin, parent_admin, parent_editor, child_admin, evidence_collector, external_auditor, readonly
  feature_key text not null, -- e.g., documents, watchdog, assessment_framework, org_settings
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default '00000000-0000-0000-0000-000000000001',
  updated_by uuid not null default '00000000-0000-0000-0000-000000000001',
  unique (role_key, feature_key)
);

comment on table public.role_permissions is 'Feature flag-style access control by role and feature key (managed via backoffice matrix)';

-- Seed defaults: Main Admin can access documents and watchdog
insert into public.role_permissions (role_key, feature_key, enabled)
values
  ('main_admin','documents', true),
  ('main_admin','watchdog', true)
on conflict (role_key, feature_key) do nothing;

-- down
drop table if exists public.role_permissions;