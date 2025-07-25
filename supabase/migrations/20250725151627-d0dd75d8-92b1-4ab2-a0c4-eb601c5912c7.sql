-- First, let's identify what the SECURITY DEFINER view is
-- Query to find views with SECURITY DEFINER
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE schemaname = 'public' 
AND definition ILIKE '%SECURITY DEFINER%';

-- Let's also check for any views that might be causing the issue
SELECT schemaname, viewname, viewowner, definition 
FROM pg_views 
WHERE schemaname = 'public' 
ORDER BY viewname;