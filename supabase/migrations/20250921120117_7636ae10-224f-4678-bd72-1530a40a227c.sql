-- [QA:RANK-01,CRIT-01] Create safe RPC for listing public tables without raw SQL from Edge
CREATE OR REPLACE FUNCTION public.list_public_tables()
RETURNS TABLE(table_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT table_name::text
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.list_public_tables() TO authenticated, anon;