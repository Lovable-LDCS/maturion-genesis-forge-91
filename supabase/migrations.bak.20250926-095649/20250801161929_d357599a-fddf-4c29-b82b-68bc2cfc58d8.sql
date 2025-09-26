-- Fix the validate_organization_access function to be VOLATILE and work with backoffice admins
CREATE OR REPLACE FUNCTION public.validate_organization_access(target_org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_has_access boolean := false;
  user_is_backoffice boolean := false;
BEGIN
  -- Check if user is a backoffice admin (bypass for internal uploads)
  SELECT EXISTS (
    SELECT 1 FROM public.backoffice_admins 
    WHERE user_id = auth.uid()
  ) INTO user_is_backoffice;
  
  IF user_is_backoffice THEN
    user_has_access := true;
    
    -- Log backoffice access
    INSERT INTO public.audit_trail (
      organization_id,
      table_name,
      record_id,
      action,
      changed_by,
      change_reason
    ) VALUES (
      target_org_id,
      'backoffice_access_validation',
      auth.uid(),
      'BACKOFFICE_ACCESS_GRANTED',
      auth.uid(),
      'Backoffice admin bypass for organization access validation'
    );
  ELSE
    -- Standard organization member check
    SELECT EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = target_org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'assessor')
    ) INTO user_has_access;
    
    -- Log standard access attempt
    INSERT INTO public.audit_trail (
      organization_id,
      table_name,
      record_id,
      action,
      changed_by,
      change_reason
    ) VALUES (
      target_org_id,
      'organization_access_validation',
      auth.uid(),
      CASE WHEN user_has_access THEN 'ACCESS_GRANTED' ELSE 'ACCESS_DENIED' END,
      auth.uid(),
      'Standard organization access validation for: ' || target_org_id::text
    );
  END IF;
  
  RETURN user_has_access;
END;
$function$;