-- up
alter table public.maturity_practice_statements
  drop constraint if exists maturity_practice_statements_organization_id_mps_number_key;

-- down
alter table public.maturity_practice_statements
  add constraint maturity_practice_statements_organization_id_mps_number_key
  unique (organization_id, mps_number);