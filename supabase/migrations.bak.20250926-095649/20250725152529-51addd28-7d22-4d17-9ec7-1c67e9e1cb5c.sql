-- Final comprehensive security analysis
-- 1. Check all views in detail to understand the SECURITY DEFINER issue
SELECT 
    c.relname as view_name,
    c.relowner,
    pg_get_userbyid(c.relowner) as owner_name,
    c.relacl as permissions
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND c.relkind = 'v';

-- 2. Check the exact definition of user_organization_invitations view again
SELECT viewname, definition 
FROM pg_views 
WHERE viewname = 'user_organization_invitations';

-- 3. Identify the two remaining functions with search path issues  
SELECT 
    p.proname,
    p.prosrc,
    p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'vector%'
  AND p.proname NOT LIKE '%_in'
  AND p.proname NOT LIKE '%_out'  
  AND p.proname NOT LIKE '%_recv'
  AND p.proname NOT LIKE '%_send'
  AND p.proname NOT LIKE '%handler'
  AND p.proname NOT LIKE '%support'
  AND p.proname NOT LIKE '%distance'
  AND p.proname NOT LIKE '%product'
  AND p.proname NOT LIKE 'array_to_%'
  AND p.proname NOT LIKE '%_to_%'
  AND p.proname NOT LIKE 'l1_%'
  AND p.proname NOT LIKE 'l2_%'
  AND p.proname NOT LIKE 'cosine_%'
  AND p.proname NOT LIKE 'inner_%'
  AND p.proname NOT LIKE 'hamming_%'
  AND p.proname NOT LIKE 'jaccard_%'
  AND p.proname NOT LIKE 'binary_%'
  AND p.proname NOT LIKE 'subvector'
  AND p.proname NOT LIKE 'halfvec%'
  AND p.proname NOT LIKE 'sparsevec%'
  AND p.proname NOT LIKE 'avg'
  AND p.proname NOT LIKE 'sum'
  AND p.proconfig IS NULL
ORDER BY p.proname;