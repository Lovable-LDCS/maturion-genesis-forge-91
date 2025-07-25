-- Check what extensions are installed and their schema location
SELECT extname, extnamespace::regnamespace as schema 
FROM pg_extension 
WHERE extname LIKE '%vector%';

-- Check if there are any other views that might be causing the SECURITY DEFINER issue
SELECT schemaname, viewname, viewowner, definition 
FROM pg_views 
WHERE schemaname = 'public' 
AND definition ILIKE '%definer%';

-- Let's also check for any remaining custom functions that might need search_path
SELECT 
    p.proname as function_name,
    CASE WHEN p.proconfig IS NULL THEN 'NO SEARCH PATH' ELSE 'HAS SEARCH PATH' END as search_path_status
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
  AND p.proconfig IS NULL
ORDER BY p.proname;