-- Update any database references from /maturity/build to /maturity/setup

-- Audit trail table updates (if any references exist)
UPDATE public.audit_trail 
SET new_value = '/maturity/setup' 
WHERE new_value = '/maturity/build' 
  AND table_name = 'navigation' 
  OR field_name LIKE '%path%' 
  OR field_name LIKE '%route%';

UPDATE public.audit_trail 
SET old_value = '/maturity/setup' 
WHERE old_value = '/maturity/build' 
  AND table_name = 'navigation' 
  OR field_name LIKE '%path%' 
  OR field_name LIKE '%route%';

-- Check for any onboarding or session data that might reference the old path
-- (This is defensive - we don't have confirmed tables with these patterns yet)
DO $$
BEGIN
  -- Update any hypothetical path references in organization data
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'current_onboarding_path') THEN
    UPDATE public.organizations 
    SET current_onboarding_path = '/maturity/setup' 
    WHERE current_onboarding_path = '/maturity/build';
  END IF;
  
  -- Update any session or navigation history
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'current_path') THEN
    UPDATE public.user_sessions 
    SET current_path = '/maturity/setup' 
    WHERE current_path = '/maturity/build';
  END IF;
END $$;

-- Log this migration for audit purposes
INSERT INTO public.audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  changed_by,
  change_reason,
  field_name,
  old_value,
  new_value
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'route_consolidation',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'ROUTE_CANONICAL_UPDATE',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Consolidated duplicate routes: /maturity/build redirects to /maturity/setup as canonical onboarding route',
  'canonical_route',
  '/maturity/build',
  '/maturity/setup'
);