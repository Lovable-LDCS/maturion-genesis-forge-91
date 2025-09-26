-- CRITICAL SECURITY FIXES: Phase 1 - Data Exposure Prevention (Final)

-- 1. SECURE SUBSCRIPTION MODULES TABLE
-- Drop existing policies safely and recreate them
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public can view active subscription modules" ON public.subscription_modules;
    DROP POLICY IF EXISTS "Admin users can manage subscription modules" ON public.subscription_modules;
    DROP POLICY IF EXISTS "Authenticated users can view active subscription modules" ON public.subscription_modules;
EXCEPTION 
    WHEN OTHERS THEN 
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

-- 2. SECURE EXTERNAL INSIGHTS ACCESS
-- Tighten external insights to prevent potential data leaks
DROP POLICY IF EXISTS "Organizations can view relevant external insights" ON public.external_insights;

CREATE POLICY "Authenticated users can view relevant external insights" 
ON public.external_insights
FOR SELECT 
TO authenticated
USING (
  -- Global insights are visible to all authenticated users
  visibility_scope = 'global'::visibility_scope 
  OR 
  -- Organization-specific insights only for organization members
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid() 
      AND om.organization_id = ANY(external_insights.matched_orgs)
  )
);

-- 3. ENHANCE INPUT VALIDATION SECURITY
-- Add XSS and injection pattern detection
CREATE OR REPLACE FUNCTION public.enhanced_input_validation(input_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  security_patterns text[] := ARRAY[
    -- SQL injection patterns
    'DROP\s+TABLE',
    'DELETE\s+FROM',
    'TRUNCATE\s+TABLE',
    'ALTER\s+TABLE',
    'CREATE\s+TABLE',
    'INSERT\s+INTO.*admin_users',
    'UPDATE.*admin_users',
    'GRANT\s+',
    'REVOKE\s+',
    -- XSS patterns
    '<script[^>]*>',
    'javascript:',
    'on\w+\s*=',
    'eval\s*\(',
    'expression\s*\(',
    'document\.cookie',
    'window\.location',
    -- Additional security patterns
    'union\s+select',
    'sleep\s*\(',
    'waitfor\s+delay',
    'benchmark\s*\(',
    'pg_sleep\s*\('
  ];
  pattern text;
  violations text[] := '{}';
BEGIN
  -- Check for malicious patterns
  FOREACH pattern IN ARRAY security_patterns
  LOOP
    IF input_text ~* pattern THEN
      violations := array_append(violations, pattern);
    END IF;
  END LOOP;
  
  -- If violations found, log and return invalid
  IF array_length(violations, 1) > 0 THEN
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
      'SECURITY_VIOLATION_DETECTED',
      auth.uid(),
      'Malicious patterns detected: ' || array_to_string(violations, ', ')
    );
    
    RETURN jsonb_build_object(
      'valid', false,
      'errors', violations,
      'sanitized', '',
      'message', 'Input contains potentially malicious content'
    );
  END IF;
  
  -- Basic sanitization
  RETURN jsonb_build_object(
    'valid', true,
    'errors', '{}',
    'sanitized', trim(input_text),
    'message', 'Input validation passed'
  );
END;
$function$;

-- 4. ADD RATE LIMITING PROTECTION
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  user_identifier text,
  operation_type text,
  max_requests integer DEFAULT 10,
  time_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  request_count integer;
  window_start timestamp with time zone;
BEGIN
  window_start := now() - (time_window_seconds || ' seconds')::interval;
  
  -- Count recent requests
  SELECT COUNT(*) INTO request_count
  FROM public.audit_trail
  WHERE changed_by = auth.uid()
    AND action = operation_type
    AND changed_at > window_start;
  
  -- If limit exceeded, log and return false
  IF request_count >= max_requests THEN
    INSERT INTO public.audit_trail (
      organization_id,
      table_name,
      record_id,
      action,
      changed_by,
      change_reason
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'rate_limiting',
      auth.uid(),
      'RATE_LIMIT_EXCEEDED',
      auth.uid(),
      'Rate limit exceeded for operation: ' || operation_type || ' (' || request_count || '/' || max_requests || ')'
    );
    
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Log this security hardening completion
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
    'SECURITY_HARDENING_PHASE_1_SUCCESS',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Successfully implemented Phase 1 security fixes: secured subscription_modules and external_insights with proper authentication, enhanced input validation with XSS protection, added rate limiting protection'
);