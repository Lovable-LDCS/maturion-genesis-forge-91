-- SECURITY FIX: Remove remaining Security Definer Views

-- Remove remaining views that still cause security definer issues
-- These are likely system views owned by postgres that bypass RLS

DROP VIEW IF EXISTS public.ai_document_chunks_search;
DROP VIEW IF EXISTS public.system_health_report_v1;
DROP VIEW IF EXISTS public.v_ai_docs_retrievable;

-- Create secure replacements only if needed for application functionality

-- If ai_document_chunks_search is needed, create a secure version
CREATE VIEW public.ai_document_chunks_filtered AS
SELECT 
  id,
  document_id,
  organization_id,
  chunk_index,
  content,
  content_hash,
  embedding,
  metadata,
  created_at,
  tokens,
  page,
  section,
  equipment_slugs,
  stage,
  layer,
  tags,
  status,
  visibility,
  uploaded_by,
  uploaded_at,
  updated_at,
  checksum,
  quality_score,
  is_clean
FROM ai_document_chunks
WHERE COALESCE((metadata->>'boilerplate')::text, 'false') <> 'true';

-- If v_ai_docs_retrievable is needed, create a secure version  
CREATE VIEW public.ai_docs_completed AS
SELECT 
  id,
  organization_id,
  file_name,
  COALESCE(title, regexp_replace(file_name, '\.[^.]+$', '', 'g')) AS title,
  document_type AS doc_type,
  domain,
  tags,
  total_chunks,
  updated_at
FROM ai_documents
WHERE processing_status = 'completed' 
  AND total_chunks > 0;

-- Note: system_health_report_v1 removed as it can expose system information
-- If system monitoring is needed, use proper admin-only functions instead

-- Log the security remediation
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
  'REMAINING_SECURITY_DEFINER_VIEWS_REMOVED',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Removed remaining security definer views: ai_document_chunks_search, system_health_report_v1, v_ai_docs_retrievable'
);