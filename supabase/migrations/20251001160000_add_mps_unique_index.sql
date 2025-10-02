-- up
create unique index if not exists mps_domain_mps_number_unique
  on public.maturity_practice_statements (domain_id, mps_number);

-- down
drop index if exists mps_domain_mps_number_unique;