-- CRITICAL SECURITY FIXES: Phase 1 - Data Exposure Prevention (Fixed)

-- 1. SECURE SUBSCRIPTION MODULES TABLE
-- Check and drop existing policies safely
DO $$ 
BEGIN
    -- Drop overly permissive public policy if it exists
    DROP POLICY IF EXISTS "Public can view active subscription modules" ON public.subscription_modules;
    
    -- Drop existing admin policy to recreate it properly
    DROP POLICY IF EXISTS "Admin users can manage subscription modules" ON public.subscription_modules;
EXCEPTION 
    WHEN OTHERS THEN 
        -- Ignore errors if policies don't exist
        NULL;
END $$;

-- Create secure policies for subscription_modules
CREATE POLICY "Authenticated users can view active subscription modules" 
ON public.subscription_modules
FOR SELECT 
TO authenticated
USING (is_active = true);

CREATE POLICY "Admin users can manage subscription modules" 
ON public.subscription_modules
FOR ALL 
TO authenticated
USING (is_user_admin())
WITH CHECK (is_user_admin());

-- 2. ADDITIONAL SECURITY HARDENING
-- Add missing user role validation function
CREATE OR REPLACE FUNCTION public.user_has_role(user_uuid uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Check if user has admin role in admin_users table
  IF required_role = 'admin' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = user_uuid AND role = 'admin'
    );
  END IF;
  
  -- Check if user has the required role in organization context
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE user_id = user_uuid AND role = required_role
  );
END;
$function$;

-- Add is_user_admin helper function
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$function$;

-- 3. SECURE ADMIN OPERATION VALIDATION
CREATE OR REPLACE FUNCTION public.validate_admin_operation(operation_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Check if current user is admin
  IF NOT public.is_user_admin() THEN
    -- Log unauthorized attempt
    INSERT INTO public.audit_trail (
      organization_id,
      table_name,
      record_id,
      action,
      changed_by,
      change_reason
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'admin_operations',
      auth.uid(),
      'UNAUTHORIZED_ADMIN_ATTEMPT',
      auth.uid(),
      'Attempted admin operation: ' || operation_type
    );
    
    RETURN FALSE;
  END IF;
  
  -- Log successful admin operation
  INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'admin_operations',
    auth.uid(),
    'ADMIN_OPERATION_AUTHORIZED',
    auth.uid(),
    'Authorized admin operation: ' || operation_type
  );
  
  RETURN TRUE;
END;
$function$;

-- Log this security hardening
INSERT INTO public.audit_trail (
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
    'SECURITY_HARDENING_PHASE_1_COMPLETE',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Completed Phase 1 security fixes: secured subscription_modules table with authenticated access, added admin validation functions, hardened database functions with proper search_path restrictions'
);