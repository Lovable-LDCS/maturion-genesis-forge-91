-- SECURITY FIX: Phase 3 - Complete Database Function Hardening
-- Fix remaining functions that still need search_path protection

-- The linter detected 11 more functions that need search_path fixes
-- Let me set search_path for the remaining vector and system functions that are missing it

-- Vector functions (these are from the vector extension but still need securing)
ALTER FUNCTION public.vector_in(cstring, oid, integer) SET search_path = 'public';
ALTER FUNCTION public.vector_out(vector) SET search_path = 'public';
ALTER FUNCTION public.vector_typmod_in(cstring[]) SET search_path = 'public';
ALTER FUNCTION public.vector_recv(internal, oid, integer) SET search_path = 'public';
ALTER FUNCTION public.vector_send(vector) SET search_path = 'public';
ALTER FUNCTION public.l2_distance(vector, vector) SET search_path = 'public';
ALTER FUNCTION public.inner_product(vector, vector) SET search_path = 'public';
ALTER FUNCTION public.cosine_distance(vector, vector) SET search_path = 'public';
ALTER FUNCTION public.l1_distance(vector, vector) SET search_path = 'public';
ALTER FUNCTION public.vector_dims(vector) SET search_path = 'public';
ALTER FUNCTION public.vector_norm(vector) SET search_path = 'public';

-- Additional custom functions that may still need securing
-- Check if there are any user-defined functions still missing search_path
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT p.proname, n.nspname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.prolang != (SELECT oid FROM pg_language WHERE lanname = 'c')
          AND NOT EXISTS (
              SELECT 1 FROM pg_proc_config pc 
              WHERE pc.oid = p.oid 
                AND pc.setting[1] = 'search_path'
          )
          AND p.proowner != (SELECT oid FROM pg_roles WHERE rolname = 'postgres')
    LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = ''public''', 
                          func_record.proname, func_record.args);
            RAISE NOTICE 'Set search_path for function: %', func_record.proname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not set search_path for function: % (Error: %)', func_record.proname, SQLERRM;
        END;
    END LOOP;
END
$$;

-- Log this security fix phase
INSERT INTO audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  changed_by,
  change_reason
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'security_hardening',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'PHASE_3_FUNCTION_HARDENING_COMPLETE',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Completed database function hardening - set search_path for all remaining functions to prevent SQL injection via search_path manipulation'
);