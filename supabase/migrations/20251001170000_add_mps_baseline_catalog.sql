-- up
create table if not exists public.mps_baseline_catalog (
  id uuid primary key default gen_random_uuid(),
  domain_key text, -- optional short key like 'leadership-governance'
  domain_name text not null,
  mps_number int not null check (mps_number between 1 and 99),
  base_title text not null,
  base_intent text not null,
  base_rationale text,
  industry_tags text[] default '{}',
  created_at timestamptz not null default now()
);

-- domain-scoped quick lookup
create index if not exists mps_baseline_catalog_domain_name_idx on public.mps_baseline_catalog (lower(domain_name));
create unique index if not exists mps_baseline_catalog_domain_num_unique on public.mps_baseline_catalog (domain_name, mps_number);

-- seed: Leadership & Governance baselines
insert into public.mps_baseline_catalog (domain_key, domain_name, mps_number, base_title, base_intent, base_rationale, industry_tags)
values
  ('leadership-governance','Leadership & Governance',1,'Governance Structure & Accountability','Define governance bodies, roles, and decision rights for oversight.','Clear governance enables accountability and effective control.', '{}'),
  ('leadership-governance','Leadership & Governance',2,'Policy Framework & Compliance Alignment','Maintain a policy hierarchy aligned to legal and regulatory requirements.','Policies translate obligations into actionable controls.', '{}'),
  ('leadership-governance','Leadership & Governance',3,'Separation of Duties & Conflict Management','Prevent conflicts and concentration of authority through SoD and checks.','Reduces fraud risk and enforces proper authorization.', '{}'),
  ('leadership-governance','Leadership & Governance',4,'Risk & Control Monitoring Cadence','Establish defined cadence for risk reviews, control testing, and reporting.','Regular cadence sustains risk visibility and response.', '{}'),
  ('leadership-governance','Leadership & Governance',5,'Legal & Regulatory Adherence Governance','Track, evaluate, and enforce compliance across the organization.','Compliance is a baseline requirement for operations.', '{}')
ON CONFLICT (domain_name, mps_number) DO NOTHING;

-- down
drop table if exists public.mps_baseline_catalog;