-- Critical Security Fixes - Phase 1
-- Fix privilege escalation and create secure admin management

-- 1. CRITICAL: Remove dangerous admin access policies
DROP POLICY IF EXISTS "Authenticated users can grant admin access" ON public.admin_users;
DROP POLICY IF EXISTS "allow_admin_override_insert" ON public.admin_users;

-- 2. Create secure admin invitation function
CREATE OR REPLACE FUNCTION public.create_admin_invitation(
  target_email text,
  target_role text DEFAULT 'admin'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  invitation_id uuid;
  current_user_role text;
BEGIN
  -- Only existing admins can create invitations
  SELECT role INTO current_user_role 
  FROM public.admin_users 
  WHERE user_id = auth.uid();
  
  IF current_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: Only admins can create admin invitations';
  END IF;
  
  -- Create invitation record
  INSERT INTO public.admin_approval_requests (
    request_type,
    entity_type,
    entity_id,
    requested_by,
    requested_changes
  ) VALUES (
    'ADMIN_INVITATION',
    'admin_users',
    gen_random_uuid(),
    auth.uid(),
    jsonb_build_object(
      'email', target_email,
      'role', target_role,
      'invited_by', auth.uid()
    )
  ) RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$$;

-- 3. Secure admin user creation policy
CREATE POLICY "Only approved requests can create admin users"
ON public.admin_users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_approval_requests
    WHERE entity_type = 'admin_users'
      AND status = 'approved'
      AND (requested_changes->>'email') = NEW.email
      AND approved_by IS NOT NULL
      AND approved_by != requested_by
  )
);

-- 4. Enhanced input validation function
CREATE OR REPLACE FUNCTION public.validate_admin_input(input_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  key text;
  value text;
  suspicious_patterns text[] := ARRAY[
    '<script',
    'javascript:',
    'on\w+\s*=',
    'eval\s*\(',
    'document\.',
    'window\.',
    'alert\(',
    'confirm\(',
    'prompt\('
  ];
  pattern text;
BEGIN
  -- Validate each field in the input data
  FOR key, value IN SELECT * FROM jsonb_each_text(input_data)
  LOOP
    IF value IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Check for suspicious patterns
    FOREACH pattern IN ARRAY suspicious_patterns
    LOOP
      IF value ~* pattern THEN
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
          'MALICIOUS_INPUT_BLOCKED',
          auth.uid(),
          'Blocked potentially malicious input in field: ' || key || ', pattern: ' || pattern
        );
        
        RETURN false;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN true;
END;
$$;

-- 5. Enhanced organization context validation
CREATE OR REPLACE FUNCTION public.validate_organization_context_secure(target_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_has_access boolean;
BEGIN
  -- Check if user has access to the organization
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = target_org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'assessor')
  ) INTO user_has_access;
  
  -- Log access attempt
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
    'Organization context validation for org: ' || target_org_id::text
  );
  
  RETURN user_has_access;
END;
$$;

-- 6. Rate limiting table for admin operations
CREATE TABLE IF NOT EXISTS public.admin_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  operation_type text NOT NULL,
  attempt_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, operation_type)
);

ALTER TABLE public.admin_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their own rate limits"
ON public.admin_rate_limits
FOR SELECT
USING (user_id = auth.uid() AND public.user_has_role(auth.uid(), 'admin'));

-- 7. Security threat detection function
CREATE OR REPLACE FUNCTION public.check_security_threats()
RETURNS TABLE(threat_level text, threat_description text, affected_users integer, last_occurrence timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  WITH threat_analysis AS (
    SELECT 
      'CRITICAL' as level,
      'Multiple failed admin access attempts' as description,
      COUNT(DISTINCT changed_by)::integer as users,
      MAX(changed_at) as last_seen
    FROM public.audit_trail
    WHERE action LIKE '%BLOCKED%'
      AND table_name = 'admin_operations'
      AND changed_at > now() - interval '1 hour'
    HAVING COUNT(*) > 5
    
    UNION ALL
    
    SELECT 
      'HIGH' as level,
      'Suspicious input patterns detected' as description,
      COUNT(DISTINCT changed_by)::integer as users,
      MAX(changed_at) as last_seen
    FROM public.audit_trail
    WHERE action = 'MALICIOUS_INPUT_BLOCKED'
      AND changed_at > now() - interval '1 hour'
    HAVING COUNT(*) > 3
    
    UNION ALL
    
    SELECT 
      'MEDIUM' as level,
      'Unauthorized organization access attempts' as description,
      COUNT(DISTINCT changed_by)::integer as users,
      MAX(changed_at) as last_seen
    FROM public.audit_trail
    WHERE action = 'ACCESS_DENIED'
      AND table_name = 'organization_access_validation'
      AND changed_at > now() - interval '1 hour'
    HAVING COUNT(*) > 10
  )
  SELECT * FROM threat_analysis
  ORDER BY 
    CASE level 
      WHEN 'CRITICAL' THEN 1 
      WHEN 'HIGH' THEN 2 
      WHEN 'MEDIUM' THEN 3 
      ELSE 4 
    END;
END;
$$;