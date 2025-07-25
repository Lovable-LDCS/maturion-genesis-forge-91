-- Fix security linter warnings migration

-- 1. Fix the extension in public schema issue
-- Move vector extension to extensions schema (recommended by Supabase)
DROP EXTENSION IF EXISTS vector;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Update any references to vector functions to use the extensions schema
-- Note: This is informational as Postgres will handle the function calls correctly

-- 2. Grant necessary permissions for the vector extension in the extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 3. Add comment for future reference
COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions to avoid placing them in public schema';

-- 4. Verify no security definer views exist (informational query)
-- The following query would help identify any remaining SECURITY DEFINER views
-- SELECT schemaname, viewname, definition FROM pg_views WHERE definition ILIKE '%SECURITY DEFINER%';

-- Note: The OTP expiry and leaked password protection warnings need to be fixed manually in Supabase dashboard:
-- 1. Go to Authentication > Settings
-- 2. Set OTP expiry to 600 seconds (10 minutes)
-- 3. Enable "Enable leaked password protection"