-- Fix for backoffice upload context - APGI Default Organization (Fixed)

-- First, create APGI organization if it doesn't exist with proper values
INSERT INTO public.organizations (
  id,
  name,
  description,
  organization_type,
  owner_id,
  created_by,
  updated_by
) VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'APGI - Backoffice',
  'Internal APGI organization for backoffice operations',
  'primary',
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000'
) ON CONFLICT (id) DO NOTHING;

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