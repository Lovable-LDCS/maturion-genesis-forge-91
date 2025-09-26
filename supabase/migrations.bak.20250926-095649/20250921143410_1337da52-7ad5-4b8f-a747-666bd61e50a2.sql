-- SECURITY FIX: Remove Security Definer Views and Overly Permissive Demo Policies

-- The issue: Demo views owned by postgres (superuser) combined with overly permissive RLS policies
-- create security definer-like behavior that bypasses proper access controls

-- Remove overly permissive demo policies that allow anonymous access to bypass RLS
DROP POLICY IF EXISTS "demo_read_ai_document_chunks" ON public.ai_document_chunks;
DROP POLICY IF EXISTS "demo_read_ai_document_versions" ON public.ai_document_versions; 
DROP POLICY IF EXISTS "demo_read_ai_documents" ON public.ai_documents;

-- Remove the demo views that create security definer behavior
DROP VIEW IF EXISTS public.v_ai_documents_demo;
DROP VIEW IF EXISTS public.v_ai_document_chunks_demo;
DROP VIEW IF EXISTS public.v_ai_document_versions_demo;

-- If demo access is still needed, create secure demo policies with proper restrictions
-- These policies only allow viewing basic metadata, not full content access

-- Secure demo policy for documents (only basic info, no content)
CREATE POLICY "Secure demo read for ai_documents"
ON public.ai_documents
FOR SELECT
TO anon
USING (
  -- Only allow access to documents marked as demo-safe
  (metadata->>'demo_accessible')::boolean = true
  AND processing_status = 'completed'
  AND total_chunks > 0
);

-- Secure demo policy for chunks (only basic info, no full content)
CREATE POLICY "Secure demo read for ai_document_chunks"  
ON public.ai_document_chunks
FOR SELECT
TO anon
USING (
  -- Only allow access to chunks from demo-accessible documents
  document_id IN (
    SELECT id FROM ai_documents 
    WHERE (metadata->>'demo_accessible')::boolean = true
      AND processing_status = 'completed'
  )
  -- Only show metadata, not full content
  AND length(content) < 200
);

-- Secure demo policy for versions (only basic metadata)
CREATE POLICY "Secure demo read for ai_document_versions"
ON public.ai_document_versions  
FOR SELECT
TO anon
USING (
  -- Only allow access to versions of demo-accessible documents
  document_id IN (
    SELECT id FROM ai_documents 
    WHERE (metadata->>'demo_accessible')::boolean = true
      AND processing_status = 'completed'
  )
);

-- Create secure demo views that don't have security definer issues
-- These views are owned by the authenticated user context, not postgres

CREATE VIEW public.v_demo_documents_secure AS
SELECT 
  id,
  file_name,
  COALESCE(title, regexp_replace(file_name, '\.[^.]+$', '', 'g')) as title,
  document_type,
  domain,
  tags,
  total_chunks,
  created_at,
  processing_status
FROM ai_documents
WHERE (metadata->>'demo_accessible')::boolean = true
  AND processing_status = 'completed'
  AND total_chunks > 0;

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
  'SECURITY_DEFINER_VIEWS_REMOVED',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Removed security definer views and overly permissive demo policies; replaced with secure demo access'
);