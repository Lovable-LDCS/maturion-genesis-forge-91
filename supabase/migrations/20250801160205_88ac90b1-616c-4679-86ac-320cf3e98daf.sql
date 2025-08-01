-- Fix the validate_organization_access function and add user as backoffice admin

-- First, fix the function to be VOLATILE (so it can INSERT audit logs)
CREATE OR REPLACE FUNCTION public.user_can_upload_to_organization(org_id uuid, user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is a backoffice admin (bypass for internal uploads)
  IF EXISTS (
    SELECT 1 FROM public.backoffice_admins 
    WHERE backoffice_admins.user_id = user_can_upload_to_organization.user_id
  ) THEN
    -- Log backoffice access for audit (function is now VOLATILE so this works)
    INSERT INTO public.audit_trail (
      organization_id,
      table_name,
      record_id,
      action,
      changed_by,
      change_reason
    ) VALUES (
      org_id,
      'backoffice_upload_access',
      user_can_upload_to_organization.user_id,
      'BACKOFFICE_UPLOAD_ACCESS_GRANTED',
      user_can_upload_to_organization.user_id,
      'Backoffice admin bypass for upload permission'
    );
    
    RETURN TRUE;
  END IF;
  
  -- Standard organization member check
  RETURN EXISTS (
    SELECT 1 
    FROM public.organization_members om
    WHERE om.organization_id = org_id 
      AND om.user_id = user_can_upload_to_organization.user_id
      AND om.role IN ('admin', 'owner')
  );
END;
$function$;

-- Add the current user as a backoffice admin (using the specific user ID from the network logs)
INSERT INTO public.backoffice_admins (user_id, email, granted_by)
VALUES (
  '1dfc1c68-022a-4b49-a86e-272a83bff8d3',
  'johan.ras2@outlook.com',
  '1dfc1c68-022a-4b49-a86e-272a83bff8d3'
) ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  granted_at = now();

-- Test the function manually for debugging
DO $$
DECLARE
  result boolean;
  primary_org_id uuid := '2f122a62-ca59-4c8e-adf6-796aa7011c5d';
  test_user_id uuid := '1dfc1c68-022a-4b49-a86e-272a83bff8d3';
BEGIN
  -- Test the upload permission function
  SELECT public.user_can_upload_to_organization(primary_org_id, test_user_id) INTO result;
  
  -- Log the test result
  INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  ) VALUES (
    primary_org_id,
    'upload_permission_test',
    test_user_id,
    'MANUAL_PERMISSION_TEST',
    test_user_id,
    'Manual test result: ' || CASE WHEN result THEN 'GRANTED' ELSE 'DENIED' END
  );
  
  RAISE NOTICE 'Upload permission test result: %', result;
END $$;