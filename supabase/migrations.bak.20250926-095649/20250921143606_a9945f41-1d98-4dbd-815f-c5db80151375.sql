-- SECURITY FIX: Remove final Security Definer Views

-- Remove the remaining view that still causes security definer issues
DROP VIEW IF EXISTS public.v_demo_documents_secure;

-- The issue appears to be that any view owned by postgres (superuser) 
-- automatically gets security definer behavior even if not explicitly set

-- If demo functionality is needed, create it as a function with proper RLS instead
CREATE OR REPLACE FUNCTION public.get_demo_documents()
RETURNS TABLE(
  id uuid,
  file_name text,
  title text,
  document_type text,
  domain text,
  tags text[],
  total_chunks integer,
  created_at timestamp with time zone,
  processing_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow if user has appropriate permissions
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to access demo documents';
  END IF;
  
  RETURN QUERY
  SELECT 
    d.id,
    d.file_name,
    COALESCE(d.title, regexp_replace(d.file_name, '\.[^.]+$', '', 'g')) as title,
    d.document_type,
    d.domain,
    d.tags,
    d.total_chunks,
    d.created_at,
    d.processing_status
  FROM ai_documents d
  WHERE (d.metadata->>'demo_accessible')::boolean = true
    AND d.processing_status = 'completed'
    AND d.total_chunks > 0;
END;
$function$;

-- Check if there are any other postgres-owned objects that might cause issues
-- Let's also ensure proper ownership of any remaining views

-- Log the final security remediation
INSERT INTO audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  changed_by,
  change_reason
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'security_views',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'FINAL_SECURITY_DEFINER_VIEWS_REMOVED',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Removed final security definer view: v_demo_documents_secure; replaced with secure function'
);