-- Phase 1: Critical Security Fixes

-- 1. Create a secure function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.user_has_role(user_uuid uuid, required_role text DEFAULT 'admin')
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_uuid 
      AND role = required_role
  );
$$;

-- 2. Create function to prevent self-approval of admin requests
CREATE OR REPLACE FUNCTION public.prevent_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Prevent self-approval for admin-related requests
  IF NEW.approved_by = OLD.requested_by THEN
    RAISE EXCEPTION 'Users cannot approve their own requests. Violation logged.';
  END IF;
  
  -- Log the approval attempt in audit trail
  INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    field_name,
    old_value,
    new_value,
    changed_by,
    change_reason
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid, -- System organization
    'admin_approval_requests',
    NEW.id,
    'APPROVAL_ATTEMPT',
    'status',
    OLD.status,
    NEW.status,
    NEW.approved_by,
    CASE 
      WHEN NEW.approved_by = OLD.requested_by THEN 'BLOCKED: Self-approval attempt'
      ELSE 'Valid approval by different admin'
    END
  );
  
  RETURN NEW;
END;
$$;

-- 3. Create trigger to enforce self-approval prevention
DROP TRIGGER IF EXISTS prevent_self_approval_trigger ON public.admin_approval_requests;
CREATE TRIGGER prevent_self_approval_trigger
  BEFORE UPDATE ON public.admin_approval_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status = 'pending')
  EXECUTE FUNCTION public.prevent_self_approval();

-- 4. Enhanced admin access validation function
CREATE OR REPLACE FUNCTION public.validate_admin_operation(operation_type text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_user_id uuid;
  is_valid_admin boolean;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is admin
  SELECT user_has_role(current_user_id, 'admin') INTO is_valid_admin;
  
  -- Log the operation attempt
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
    current_user_id,
    operation_type,
    current_user_id,
    CASE 
      WHEN is_valid_admin THEN 'Valid admin operation'
      ELSE 'BLOCKED: Unauthorized admin operation attempt'
    END
  );
  
  RETURN is_valid_admin;
END;
$$;

-- 5. Update RLS policies to use new security functions
DROP POLICY IF EXISTS "Admin users can manage approval requests" ON public.admin_approval_requests;
CREATE POLICY "Admin users can manage approval requests"
ON public.admin_approval_requests
FOR ALL
TO authenticated
USING (user_has_role(auth.uid(), 'admin'))
WITH CHECK (user_has_role(auth.uid(), 'admin'));

-- 6. Enhanced audit logging for admin operations
CREATE OR REPLACE FUNCTION public.log_admin_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Enhanced logging for admin table modifications
  INSERT INTO public.admin_activity_log (
    admin_user_id,
    action_type,
    entity_type,
    entity_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    TG_OP || '_SECURITY_CHECK',
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', now(),
      'user_id', auth.uid(),
      'validation_passed', user_has_role(auth.uid(), 'admin')
    ),
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. Apply security trigger to sensitive tables
DROP TRIGGER IF EXISTS admin_security_audit_trigger ON public.admin_users;
CREATE TRIGGER admin_security_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_security_event();

-- 8. Rate limiting table for additional security
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  operation_type text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy for rate limits
CREATE POLICY "Admins can manage rate limits"
ON public.security_rate_limits
FOR ALL
TO authenticated
USING (user_has_role(auth.uid(), 'admin'))
WITH CHECK (user_has_role(auth.uid(), 'admin'));