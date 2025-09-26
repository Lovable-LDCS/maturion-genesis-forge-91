-- Fix for backoffice upload context - APGI Default Organization (Updated approach)

-- Create backoffice_admins table for tracking internal users
CREATE TABLE IF NOT EXISTS public.backoffice_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on backoffice_admins
ALTER TABLE public.backoffice_admins ENABLE ROW LEVEL SECURITY;

-- Only admin users can manage backoffice admins
CREATE POLICY "Admin users can manage backoffice admins"
ON public.backoffice_admins
FOR ALL
TO authenticated
USING (is_user_admin())
WITH CHECK (is_user_admin());

-- Update the upload permission function to allow backoffice bypass
CREATE OR REPLACE FUNCTION public.user_can_upload_to_organization(org_id uuid, user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is a backoffice admin (bypass for internal uploads)
  IF EXISTS (
    SELECT 1 FROM public.backoffice_admins 
    WHERE backoffice_admins.user_id = user_can_upload_to_organization.user_id
  ) THEN
    -- Log backoffice access for audit
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

-- Function to add backoffice admin and assign to primary organization
CREATE OR REPLACE FUNCTION public.add_backoffice_admin(
  admin_email text,
  admin_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  primary_org_id uuid;
BEGIN
  -- Only allow if current user is admin
  IF NOT is_user_admin() THEN
    RETURN FALSE;
  END IF;
  
  -- Get the user's primary organization
  SELECT get_user_primary_organization(admin_user_id) INTO primary_org_id;
  
  -- If no primary org, get any organization the user is a member of
  IF primary_org_id IS NULL THEN
    SELECT om.organization_id INTO primary_org_id
    FROM organization_members om
    WHERE om.user_id = admin_user_id
    LIMIT 1;
  END IF;
  
  -- Insert backoffice admin
  INSERT INTO public.backoffice_admins (user_id, email, granted_by)
  VALUES (admin_user_id, admin_email, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    granted_by = auth.uid(),
    granted_at = now();
  
  -- Ensure they have owner role in their organization (if they have one)
  IF primary_org_id IS NOT NULL THEN
    INSERT INTO public.organization_members (user_id, organization_id, role)
    VALUES (admin_user_id, primary_org_id, 'owner')
    ON CONFLICT (user_id, organization_id) DO UPDATE SET
      role = 'owner';
  END IF;
  
  -- Log the action
  INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  ) VALUES (
    COALESCE(primary_org_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'backoffice_admins',
    admin_user_id,
    'BACKOFFICE_ADMIN_ADDED',
    auth.uid(),
    'Added backoffice admin with upload permissions bypass'
  );
  
  RETURN TRUE;
END;
$function$;