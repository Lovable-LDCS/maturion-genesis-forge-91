-- Let's investigate the SECURITY DEFINER view issue more thoroughly
-- Check if there are any materialized views or other objects causing this
SELECT 
    schemaname, 
    viewname, 
    viewowner,
    definition
FROM pg_views 
WHERE schemaname = 'public';

-- Also check for materialized views
SELECT 
    schemaname, 
    matviewname, 
    matviewowner,
    definition
FROM pg_matviews 
WHERE schemaname = 'public';

-- Check the vector extension location
SELECT extname, extnamespace::regnamespace as schema 
FROM pg_extension 
WHERE extname = 'vector';