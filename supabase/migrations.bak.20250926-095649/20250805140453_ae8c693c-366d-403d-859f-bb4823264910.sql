-- Fix critical security issues identified in linter

-- 1. Fix the incomplete validate_input_security function that was causing security bypass
CREATE OR REPLACE FUNCTION public.validate_input_security(input_text text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  security_patterns text[] := ARRAY[
    'DROP\s+TABLE',
    'DELETE\s+FROM',
    'TRUNCATE\s+TABLE',
    'ALTER\s+TABLE',
    'CREATE\s+TABLE',
    'INSERT\s+INTO.*admin_users',
    'UPDATE.*admin_users',
    'GRANT\s+',
    'REVOKE\s+',
    '<script[^>]*>',
    'javascript:',
    'on\w+\s*=',
    'eval\s*\(',
    'expression\s*\('
  ];
  pattern text;
BEGIN
  -- Check for malicious patterns
  FOREACH pattern IN ARRAY security_patterns
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
        'SECURITY_VIOLATION_DETECTED',
        auth.uid(),
        'Malicious pattern detected: ' || pattern
      );
      
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$function$;

-- 2. Create secure admin grant function with proper authorization
CREATE OR REPLACE FUNCTION public.request_admin_access(
  target_user_email text,
  justification text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  requesting_user_id uuid;
  target_user_id uuid;
  existing_admin_count integer;
  request_id uuid;
BEGIN
  requesting_user_id := auth.uid();
  
  -- Validate input
  IF NOT public.validate_input_security(target_user_email || justification) THEN
    RETURN json_build_object('success', false, 'error', 'Security validation failed');
  END IF;
  
  -- Check if requester is already an admin (only existing admins can grant access)
  IF NOT public.is_user_admin(requesting_user_id) THEN
    -- For initial setup, allow if no admins exist
    SELECT COUNT(*) INTO existing_admin_count FROM public.admin_users;
    
    IF existing_admin_count > 0 THEN
      INSERT INTO public.audit_trail (
        organization_id, table_name, record_id, action, changed_by, change_reason
      ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        'admin_access_requests',
        requesting_user_id,
        'UNAUTHORIZED_ADMIN_REQUEST',
        requesting_user_id,
        'Non-admin attempted to request admin access for: ' || target_user_email
      );
      
      RETURN json_build_object('success', false, 'error', 'Only existing admins can grant admin access');
    END IF;
  END IF;
  
  -- Get target user ID
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_user_email;
  
  IF target_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if user is already admin
  IF public.is_user_admin(target_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'User is already an admin');
  END IF;
  
  -- Create admin approval request
  INSERT INTO public.admin_approval_requests (
    request_type,
    entity_type,
    entity_id,
    requested_by,
    requested_changes
  ) VALUES (
    'GRANT_ADMIN_ACCESS',
    'user',
    target_user_id,
    requesting_user_id,
    json_build_object(
      'target_email', target_user_email,
      'justification', justification
    )
  ) RETURNING id INTO request_id;
  
  -- If no existing admins, auto-approve (initial setup)
  IF existing_admin_count = 0 THEN
    UPDATE public.admin_approval_requests 
    SET status = 'approved', approved_by = requesting_user_id 
    WHERE id = request_id;
    
    -- Grant admin access
    INSERT INTO public.admin_users (user_id, email, granted_by)
    VALUES (target_user_id, target_user_email, requesting_user_id);
    
    RETURN json_build_object('success', true, 'message', 'Admin access granted (initial setup)');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Admin access request created, awaiting approval');
END;
$function$;

-- 3. Add rate limiting for admin operations
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  operation_type text NOT NULL,
  attempt_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, operation_type)
);

-- Enable RLS on rate limits table
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits" ON public.security_rate_limits
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage rate limits" ON public.security_rate_limits
FOR ALL USING (true);

-- 4. Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  operation_type_param text,
  max_attempts integer DEFAULT 5,
  window_minutes integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Clean old rate limit records
  DELETE FROM public.security_rate_limits 
  WHERE window_start < window_start_time;
  
  -- Get current attempt count
  SELECT attempt_count INTO current_count
  FROM public.security_rate_limits
  WHERE user_id = auth.uid() 
    AND operation_type = operation_type_param
    AND window_start >= window_start_time;
  
  IF current_count IS NULL THEN
    -- First attempt in window
    INSERT INTO public.security_rate_limits (user_id, operation_type, attempt_count)
    VALUES (auth.uid(), operation_type_param, 1)
    ON CONFLICT (user_id, operation_type) 
    DO UPDATE SET 
      attempt_count = 1,
      window_start = now();
    
    RETURN true;
  ELSIF current_count >= max_attempts THEN
    -- Rate limit exceeded
    INSERT INTO public.audit_trail (
      organization_id, table_name, record_id, action, changed_by, change_reason
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'rate_limits',
      auth.uid(),
      'RATE_LIMIT_EXCEEDED',
      auth.uid(),
      'Rate limit exceeded for operation: ' || operation_type_param
    );
    
    RETURN false;
  ELSE
    -- Increment counter
    UPDATE public.security_rate_limits 
    SET attempt_count = attempt_count + 1
    WHERE user_id = auth.uid() AND operation_type = operation_type_param;
    
    RETURN true;
  END IF;
END;
$function$;

-- 5. Create secure file upload validation function
CREATE OR REPLACE FUNCTION public.validate_file_upload(
  file_name text,
  file_size bigint,
  mime_type text
) RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  sanitized_name text;
  allowed_types text[] := ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ];
  max_file_size bigint := 50 * 1024 * 1024; -- 50MB
BEGIN
  -- Rate limit check
  IF NOT public.check_rate_limit('FILE_UPLOAD', 10, 5) THEN
    RETURN json_build_object('valid', false, 'error', 'Rate limit exceeded');
  END IF;
  
  -- Sanitize file name (prevent path traversal)
  sanitized_name := regexp_replace(file_name, '[^a-zA-Z0-9._-]', '_', 'g');
  sanitized_name := regexp_replace(sanitized_name, '\.\.', '_', 'g');
  
  -- Validate file size
  IF file_size > max_file_size THEN
    RETURN json_build_object('valid', false, 'error', 'File size exceeds limit');
  END IF;
  
  -- Validate MIME type
  IF NOT (mime_type = ANY(allowed_types)) THEN
    RETURN json_build_object('valid', false, 'error', 'File type not allowed');
  END IF;
  
  -- Log successful validation
  INSERT INTO public.audit_trail (
    organization_id, table_name, record_id, action, changed_by, change_reason
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'file_validation',
    auth.uid(),
    'FILE_VALIDATION_SUCCESS',
    auth.uid(),
    'File validated: ' || sanitized_name
  );
  
  RETURN json_build_object('valid', true, 'sanitized_name', sanitized_name);
END;
$function$;