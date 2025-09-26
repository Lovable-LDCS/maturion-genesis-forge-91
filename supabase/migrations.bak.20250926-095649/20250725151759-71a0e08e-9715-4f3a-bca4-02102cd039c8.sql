-- Fix the SECURITY DEFINER view issue by recreating it without SECURITY DEFINER
-- The user_organization_invitations view doesn't need SECURITY DEFINER as it has proper RLS

DROP VIEW IF EXISTS public.user_organization_invitations;

-- Recreate the view without SECURITY DEFINER (just a normal view)
CREATE VIEW public.user_organization_invitations AS 
SELECT 
    i.id,
    i.organization_id,
    i.invited_by,
    i.email,
    i.role,
    i.status,
    i.invitation_token,
    i.expires_at,
    i.created_at,
    i.updated_at,
    o.name AS organization_name
FROM organization_invitations i
JOIN organizations o ON i.organization_id = o.id
WHERE user_can_manage_org_invitations(i.organization_id) 
   OR (i.email = (auth.jwt() ->> 'email'::text) 
       AND i.status = 'pending'::invitation_status 
       AND i.expires_at > now());

-- Now let's identify the remaining functions with search path issues
-- Get list of functions that don't have search_path set
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.prosrc as source
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'pg_%'
  AND p.proname NOT LIKE '%_in'
  AND p.proname NOT LIKE '%_out'
  AND p.proname NOT LIKE '%_recv'
  AND p.proname NOT LIKE '%_send'
  AND p.proname NOT LIKE '%_typmod_in'
  AND p.proname NOT LIKE 'array_to_%'
  AND p.proname NOT LIKE '%_distance'
  AND p.proname NOT LIKE '%_product'
  AND p.proname NOT LIKE '%handler'
  AND p.proname NOT LIKE '%support'
  AND p.proname NOT LIKE '%_norm'
  AND p.proname NOT LIKE '%_normalize'
  AND p.proname NOT LIKE 'binary_quantize'
  AND p.proname NOT LIKE 'subvector'
  AND p.proname NOT LIKE '%_add'
  AND p.proname NOT LIKE '%_sub'
  AND p.proname NOT LIKE '%_mul'
  AND p.proname NOT LIKE '%_concat'
  AND p.proname NOT LIKE '%_lt'
  AND p.proname NOT LIKE '%_le'
  AND p.proname NOT LIKE '%_eq'
  AND p.proname NOT LIKE '%_ne'
  AND p.proname NOT LIKE '%_ge'
  AND p.proname NOT LIKE '%_gt'
  AND p.proname NOT LIKE '%_cmp'
  AND p.proname NOT LIKE '%_accum'
  AND p.proname NOT LIKE '%_avg'
  AND p.proname NOT LIKE '%_combine'
  AND p.proname NOT LIKE 'hamming_%'
  AND p.proname NOT LIKE 'jaccard_%'
  AND p.proname NOT LIKE 'vector_dims'
  AND p.proname NOT LIKE 'vector_to_%'
  AND p.proname NOT LIKE '%_to_vector'
  AND p.proname NOT LIKE '%_to_halfvec'
  AND p.proname NOT LIKE '%_to_sparsevec'
  AND p.proname NOT LIKE '%_to_float4'
  AND NOT EXISTS (
    SELECT 1 
    FROM pg_proc_config 
    WHERE pg_proc_config.oid = p.oid 
    AND pg_proc_config.setting LIKE '%search_path%'
  )
ORDER BY p.proname;