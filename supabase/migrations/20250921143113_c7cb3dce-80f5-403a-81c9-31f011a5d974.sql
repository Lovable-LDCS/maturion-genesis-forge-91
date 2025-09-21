-- SECURITY REMEDIATION: Phase 2B - Fix remaining issues (corrected)

-- Fix the last RLS error: system_reports table 
ALTER TABLE public.system_reports ENABLE ROW LEVEL SECURITY;

-- Add appropriate RLS policy for system_reports (admin/superuser access only)
CREATE POLICY "Only superusers can access system reports"
ON public.system_reports
FOR ALL
USING (is_superuser())
WITH CHECK (is_superuser());

-- Fix SECURITY DEFINER functions - need to DROP and recreate some due to parameter changes

-- Fix count_chunks_by_organization function (drop first due to parameter rename)
DROP FUNCTION IF EXISTS public.count_chunks_by_organization(uuid);

CREATE OR REPLACE FUNCTION public.count_chunks_by_organization(org_id_param uuid)
RETURNS TABLE(total_chunks bigint, chunks_with_embeddings bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings
  FROM ai_document_chunks adc
  JOIN ai_documents ad ON adc.document_id = ad.id
  WHERE ad.organization_id = org_id_param;
END;
$function$;

-- Fix enhanced_input_validation function
CREATE OR REPLACE FUNCTION public.enhanced_input_validation(input_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  validation_result jsonb;
  security_score numeric := 1.0;
  risk_factors text[] := ARRAY[]::text[];
BEGIN
  -- Initialize validation result
  validation_result := jsonb_build_object(
    'is_valid', true,
    'security_score', security_score,
    'risk_factors', risk_factors,
    'sanitized_input', input_data
  );
  
  -- Basic SQL injection detection
  IF input_data::text ~* '(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|GRANT|REVOKE)\s' THEN
    risk_factors := array_append(risk_factors, 'sql_injection_keywords');
    security_score := security_score * 0.1;
  END IF;
  
  -- XSS detection
  IF input_data::text ~* '(<script|javascript:|on\w+\s*=|eval\s*\(|expression\s*\()' THEN
    risk_factors := array_append(risk_factors, 'xss_patterns');
    security_score := security_score * 0.2;
  END IF;
  
  -- Check for suspicious patterns
  IF input_data::text ~* '(union\s+select|or\s+1\s*=\s*1|and\s+1\s*=\s*1)' THEN
    risk_factors := array_append(risk_factors, 'sql_union_injection');
    security_score := security_score * 0.1;
  END IF;
  
  -- Update result
  validation_result := jsonb_build_object(
    'is_valid', security_score > 0.5,
    'security_score', security_score,
    'risk_factors', risk_factors,
    'sanitized_input', input_data
  );
  
  -- Log security violations
  IF security_score < 0.5 THEN
    INSERT INTO audit_trail (
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
      'Enhanced validation failed: ' || array_to_string(risk_factors, ', ')
    );
  END IF;
  
  RETURN validation_result;
END;
$function$;

-- Fix expire_approval_requests function
CREATE OR REPLACE FUNCTION public.expire_approval_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark expired approval requests as expired and log the action
  UPDATE approval_requests 
  SET 
    decision = 'expired',
    decided_at = now(),
    updated_at = now()
  WHERE decision = 'pending' 
    AND expires_at < now();
    
  -- Log the expiration action
  INSERT INTO audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  )
  SELECT 
    organization_id,
    'approval_requests',
    id,
    'auto_expired',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Approval request expired automatically'
  FROM approval_requests 
  WHERE decision = 'expired' 
    AND decided_at >= now() - interval '1 minute';
END;
$function$;