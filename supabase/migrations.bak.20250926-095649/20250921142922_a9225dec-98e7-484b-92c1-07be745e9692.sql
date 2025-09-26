-- SECURITY REMEDIATION: Phase 1 - Fix document_types RLS
-- This is a lookup table that should be readable by all authenticated users

-- Enable RLS on document_types (it's a global lookup table)
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read document types (it's reference data)
CREATE POLICY "Authenticated users can view document types"
ON public.document_types
FOR SELECT
TO authenticated
USING (true);

-- Only allow admins/system to modify document types
CREATE POLICY "Only superusers can manage document types"
ON public.document_types
FOR ALL
USING (is_superuser())
WITH CHECK (is_superuser());

-- Priority 2: Fix critical SECURITY DEFINER functions without search_path
-- These functions are vulnerable to privilege escalation attacks

-- Fix exec_sql function (this one is particularly dangerous)
DROP FUNCTION IF EXISTS public.exec_sql(text);

-- Fix regenerate_missing_embeddings function
CREATE OR REPLACE FUNCTION public.regenerate_missing_embeddings()
RETURNS TABLE(chunks_updated bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count bigint;
BEGIN
  -- Count chunks that need embeddings
  SELECT COUNT(*) INTO updated_count
  FROM ai_document_chunks
  WHERE embedding IS NULL
    AND content IS NOT NULL
    AND length(trim(content)) > 0;
  
  -- Log the embedding regeneration need
  INSERT INTO audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  ) 
  SELECT DISTINCT
    ad.organization_id,
    'ai_document_chunks',
    ad.organization_id,
    'embedding_regeneration_needed',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Found ' || updated_count || ' chunks without embeddings that need regeneration'
  FROM ai_document_chunks adc
  JOIN ai_documents ad ON adc.document_id = ad.id
  WHERE adc.embedding IS NULL
    AND adc.content IS NOT NULL
    AND length(trim(adc.content)) > 0;
  
  RETURN QUERY SELECT updated_count;
END;
$function$;

-- Fix check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  user_id_param uuid, 
  action_type_param text, 
  window_minutes_param integer DEFAULT 5, 
  max_attempts_param integer DEFAULT 10
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  attempt_count integer;
BEGIN
  -- Count recent attempts within the time window
  SELECT COUNT(*) INTO attempt_count
  FROM rate_limit_log
  WHERE user_id = user_id_param
    AND action_type = action_type_param
    AND attempted_at > (now() - (window_minutes_param || ' minutes')::interval);
  
  -- Log this attempt
  INSERT INTO rate_limit_log (user_id, action_type, attempted_at)
  VALUES (user_id_param, action_type_param, now());
  
  -- Return true if under the limit, false if over
  RETURN attempt_count < max_attempts_param;
END;
$function$;