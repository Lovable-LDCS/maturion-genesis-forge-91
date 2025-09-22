-- Update DELETE policies to include superuser bypass for document management tables

-- Fix ai_documents DELETE policy
DROP POLICY IF EXISTS "Admins can delete documents" ON ai_documents;
CREATE POLICY "Superuser and org admins can delete documents" 
ON ai_documents 
FOR DELETE 
USING (is_superuser() OR (organization_id IN ( 
  SELECT om.organization_id
  FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text])))
)));

-- Fix ai_document_versions DELETE policy  
DROP POLICY IF EXISTS "Admins can delete versions" ON ai_document_versions;
CREATE POLICY "Superuser and org admins can delete versions"
ON ai_document_versions
FOR DELETE
USING (is_superuser() OR (organization_id IN (
  SELECT om.organization_id
  FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text])))
)));

-- Fix ai_document_chunks DELETE policy
DROP POLICY IF EXISTS "Admins can delete chunks from their organization" ON ai_document_chunks;
CREATE POLICY "Superuser and org admins can delete chunks"
ON ai_document_chunks  
FOR DELETE
USING (is_superuser() OR (organization_id IN (
  SELECT om.organization_id
  FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text])))
)));

-- Log the policy update
INSERT INTO audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  changed_by,
  change_reason
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'rls_policies',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'SUPERUSER_DELETE_BYPASS_ADDED',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Added superuser bypass to DELETE policies for ai_documents, ai_document_versions, and ai_document_chunks tables'
);