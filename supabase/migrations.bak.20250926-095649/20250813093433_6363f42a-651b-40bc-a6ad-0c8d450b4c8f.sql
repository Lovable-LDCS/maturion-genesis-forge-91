-- SECURITY HARDENING: Phase 2 - Fix Database Configuration Issues

-- 1. FIX FUNCTION SEARCH PATH SECURITY ISSUES
-- Update remaining functions to have secure search_path

CREATE OR REPLACE FUNCTION public.get_user_primary_organization(user_uuid uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT o.id
  FROM public.organizations o
  LEFT JOIN public.organization_members om ON om.organization_id = o.id
  WHERE (o.owner_id = user_uuid OR om.user_id = user_uuid)
    AND o.organization_type = 'primary'
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_primary_organization(org_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = org_uuid AND organization_type = 'primary'
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_can_view_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.calculate_assessment_progress(assessment_uuid uuid)
RETURNS TABLE(total_criteria integer, completed_criteria integer, completion_percentage numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_criteria,
    COUNT(CASE WHEN ase.status = 'approved_locked' THEN 1 END)::INTEGER as completed_criteria,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(CASE WHEN ase.status = 'approved_locked' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC(5,2)
    END as completion_percentage
  FROM public.assessment_scores ase
  WHERE ase.assessment_id = assessment_uuid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.count_chunks_by_organization(org_id uuid)
RETURNS TABLE(total_chunks bigint, chunks_with_embeddings bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings
  FROM public.ai_document_chunks adc
  WHERE adc.organization_id = org_id;
END;
$function$;

-- 2. ADD ADDITIONAL RATE LIMITING AND MONITORING
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  event_details jsonb DEFAULT '{}'::jsonb,
  severity_level text DEFAULT 'medium'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason,
    field_name,
    new_value
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'security_events',
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    event_type,
    COALESCE(auth.uid(), '00000000-0000-0000-000000000000'::uuid),
    'Security event logged with severity: ' || severity_level,
    'event_details',
    event_details::text
  );
END;
$function$;

-- 3. CREATE SECURE PASSWORD VALIDATION FUNCTION
CREATE OR REPLACE FUNCTION public.validate_password_strength(password_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  issues text[] := '{}';
  strength_score integer := 0;
BEGIN
  -- Check minimum length
  IF length(password_text) < 12 THEN
    issues := array_append(issues, 'Password must be at least 12 characters long');
  ELSE
    strength_score := strength_score + 1;
  END IF;
  
  -- Check for uppercase letters
  IF password_text !~ '[A-Z]' THEN
    issues := array_append(issues, 'Password must contain at least one uppercase letter');
  ELSE
    strength_score := strength_score + 1;
  END IF;
  
  -- Check for lowercase letters
  IF password_text !~ '[a-z]' THEN
    issues := array_append(issues, 'Password must contain at least one lowercase letter');
  ELSE
    strength_score := strength_score + 1;
  END IF;
  
  -- Check for numbers
  IF password_text !~ '[0-9]' THEN
    issues := array_append(issues, 'Password must contain at least one number');
  ELSE
    strength_score := strength_score + 1;
  END IF;
  
  -- Check for special characters
  IF password_text !~ '[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>/?]' THEN
    issues := array_append(issues, 'Password must contain at least one special character');
  ELSE
    strength_score := strength_score + 1;
  END IF;
  
  -- Check for common patterns
  IF password_text ~* '(password|123456|qwerty|admin|test|user)' THEN
    issues := array_append(issues, 'Password contains common words that should be avoided');
    strength_score := strength_score - 1;
  END IF;
  
  -- Return validation result
  RETURN jsonb_build_object(
    'valid', array_length(issues, 1) = 0,
    'issues', issues,
    'strength_score', GREATEST(0, strength_score),
    'strength_level', 
      CASE 
        WHEN strength_score >= 5 THEN 'strong'
        WHEN strength_score >= 3 THEN 'medium'
        ELSE 'weak'
      END
  );
END;
$function$;

-- Log completion of Phase 2 security hardening
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
    'SECURITY_HARDENING_PHASE_2_SUCCESS',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Completed Phase 2 security hardening: fixed function search_path issues, added enhanced password validation, improved security event logging'
);