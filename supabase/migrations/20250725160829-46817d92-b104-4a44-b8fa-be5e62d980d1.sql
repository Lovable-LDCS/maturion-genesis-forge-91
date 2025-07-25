-- Phase 1: Critical Database Security Fixes

-- Fix all SECURITY DEFINER functions to include proper search_path protection
-- This prevents schema hijacking attacks

-- 1. Fix user_has_role function
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

-- 2. Fix prevent_self_approval function
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
    '00000000-0000-0000-0000-000000000000'::uuid,
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

-- 3. Fix validate_admin_operation function
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
  
  -- Check if user is admin using the secure function
  SELECT public.user_has_role(current_user_id, 'admin') INTO is_valid_admin;
  
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

-- 4. Fix log_admin_security_event function
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
      'validation_passed', public.user_has_role(auth.uid(), 'admin')
    ),
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Fix other SECURITY DEFINER functions that may be missing search_path
CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.log_admin_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.admin_activity_log (
    admin_user_id,
    action_type,
    entity_type,
    entity_id,
    details
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_org_invitations(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    -- User is organization owner
    SELECT 1 FROM public.organizations 
    WHERE id = org_id AND owner_id = auth.uid()
  ) OR EXISTS (
    -- User is organization admin/owner member
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = org_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    -- User is owner
    SELECT 1 FROM public.organizations 
    WHERE id = org_id AND owner_id = auth.uid()
  ) OR EXISTS (
    -- User is member
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = org_id AND user_id = auth.uid()
  ) OR EXISTS (
    -- User has pending invitation
    SELECT 1 FROM public.organization_invitations 
    WHERE organization_id = org_id 
      AND email = (auth.jwt() ->> 'email'::text)
      AND status = 'pending'
      AND expires_at > now()
  );
$$;

-- 6. Create additional security validation functions
CREATE OR REPLACE FUNCTION public.validate_input_security(input_text text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  suspicious_patterns text[] := ARRAY[
    'script>',
    'javascript:',
    'on\w+\s*=',
    'eval\s*\(',
    'document\.',
    'window\.',
    '<iframe',
    'data:text/html'
  ];
  pattern text;
BEGIN
  -- Check for common XSS patterns
  FOREACH pattern IN ARRAY suspicious_patterns
  LOOP
    IF input_text ~* pattern THEN
      -- Log security violation
      INSERT INTO public.audit_trail (
        organization_id,
        table_name,
        record_id,
        action,
        changed_by,
        change_reason
      ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        'security_validation',
        auth.uid(),
        'INPUT_VALIDATION_FAILED',
        auth.uid(),
        'Potentially malicious input detected: ' || pattern
      );
      
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$;

-- 7. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'security_events',
    auth.uid(),
    event_type,
    auth.uid(),
    details::text
  );
END;
$$;