-- SECURITY FIX: Remove final remaining Security Definer Views

-- Remove the last two views that are causing security definer issues
-- These are the replacement views we created but they're still owned by postgres
DROP VIEW IF EXISTS public.ai_docs_completed;
DROP VIEW IF EXISTS public.ai_document_chunks_filtered;

-- Instead of views owned by postgres (which automatically become security definer),
-- create functions with proper access controls if this functionality is needed

-- Function to get completed documents (replaces ai_docs_completed view)
CREATE OR REPLACE FUNCTION public.get_completed_documents()
RETURNS TABLE(
  id uuid,
  organization_id uuid,
  file_name text,
  title text,
  doc_type text,
  domain text,
  tags text[],
  total_chunks integer,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user has access to view documents
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Must be a member of an organization to view documents';
  END IF;
  
  RETURN QUERY
  SELECT 
    d.id,
    d.organization_id,
    d.file_name,
    COALESCE(d.title, regexp_replace(d.file_name, '\.[^.]+$', '', 'g')) AS title,
    d.document_type AS doc_type,
    d.domain,
    d.tags,
    d.total_chunks,
    d.updated_at
  FROM ai_documents d
  JOIN organization_members om ON d.organization_id = om.organization_id
  WHERE om.user_id = auth.uid()
    AND d.processing_status = 'completed'
    AND d.total_chunks > 0;
END;
$function$;

-- Function to get filtered document chunks (replaces ai_document_chunks_filtered view)
CREATE OR REPLACE FUNCTION public.get_filtered_document_chunks(exclude_boilerplate boolean DEFAULT true)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  organization_id uuid,
  chunk_index integer,
  content text,
  content_hash text,
  embedding vector,
  metadata jsonb,
  created_at timestamp with time zone,
  tokens integer,
  page integer,
  section text,
  equipment_slugs text[],
  stage text,
  layer smallint,
  tags text[],
  status text,
  visibility text,
  uploaded_by uuid,
  uploaded_at timestamp with time zone,
  updated_at timestamp with time zone,
  checksum text,
  quality_score real,
  is_clean boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user has access to view chunks
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Must be a member of an organization to view document chunks';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.document_id,
    c.organization_id,
    c.chunk_index,
    c.content,
    c.content_hash,
    c.embedding,
    c.metadata,
    c.created_at,
    c.tokens,
    c.page,
    c.section,
    c.equipment_slugs,
    c.stage,
    c.layer,
    c.tags,
    c.status,
    c.visibility,
    c.uploaded_by,
    c.uploaded_at,
    c.updated_at,
    c.checksum,
    c.quality_score,
    c.is_clean
  FROM ai_document_chunks c
  JOIN organization_members om ON c.organization_id = om.organization_id
  WHERE om.user_id = auth.uid()
    AND (NOT exclude_boilerplate OR COALESCE((c.metadata->>'boilerplate')::text, 'false') <> 'true');
END;
$function$;

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
  'ALL_SECURITY_DEFINER_VIEWS_REMOVED',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Removed final security definer views: ai_docs_completed, ai_document_chunks_filtered; replaced with secure functions'
);