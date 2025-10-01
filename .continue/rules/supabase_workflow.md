# Supabase workflow (local agent)

- Never ask for raw secrets. Use filesystem only. I will run any terminal commands you propose.
- DB changes must be **timestamped SQL migrations** under `supabase/migrations/`.
  - File name format: `YYYYMMDDHHMMSS_name.sql` (UTC timestamp).
  - Include `-- up` / `-- down` sections when helpful, or a single forward migration if reversible is not realistic.
- After creating migrations, **propose the exact CLI** I should run (Windows PowerShell):
  1) `supabase db push`  – applies migrations to the linked project
  2) `supabase gen types typescript --project-id <id> > src/types/supabase.ts`
- Always **read**:
  - `supabase/config.toml` → `project_id`
  - Existing files in `supabase/migrations/` to avoid conflicts
- Always **write**:
  - Migration files only (and application code that uses the new schema)
- Code blocks must include language + path, e.g.  
  ```sql supabase/migrations/20251001113000_add_projects.sql
  -- up
  create table if not exists public.projects(
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamptz not null default now()
  );
  -- down
  drop table if exists public.projects;
