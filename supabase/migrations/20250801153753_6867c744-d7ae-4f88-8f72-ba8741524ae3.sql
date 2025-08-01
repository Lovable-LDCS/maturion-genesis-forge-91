-- Critical Security Fixes - Simplified
-- Remove dangerous policies and create secure alternatives

-- 1. CRITICAL: Remove privilege escalation vulnerability
DROP POLICY IF EXISTS "Authenticated users can grant admin access" ON public.admin_users;
DROP POLICY IF EXISTS "allow_admin_override_insert" ON public.admin_users;

-- 2. Create proper admin creation policy
CREATE POLICY "Restrict admin user creation"
ON public.admin_users
FOR INSERT
WITH CHECK (false); -- Block all direct inserts for now

-- 3. Enhanced input validation function
CREATE OR REPLACE FUNCTION public.validate_secure_input(input_text text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
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
  IF input_text IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check for suspicious patterns
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
        'MALICIOUS_INPUT_BLOCKED',
        auth.uid(),
        'Blocked potentially malicious input, pattern: ' || pattern
      );
      
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$;

-- 4. Enhanced organization validation
CREATE OR REPLACE FUNCTION public.validate_organization_access(target_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_has_access boolean := false;
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
    'Organization access validation for: ' || target_org_id::text
  );
  
  RETURN user_has_access;
END;
$$;

-- 5. Security monitoring function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  event_details text,
  severity_level text DEFAULT 'MEDIUM'
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
    change_reason,
    field_name
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'security_monitoring',
    auth.uid(),
    event_type,
    auth.uid(),
    event_details,
    severity_level
  );
END;
$$;