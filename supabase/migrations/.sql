-- up
create table if not exists public.healthcheck(id int primary key, ok bool not null default true);

-- down
drop table if exists public.healthcheck;