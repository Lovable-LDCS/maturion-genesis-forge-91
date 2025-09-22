-- Migration to backfill missing metadata for legacy documents and improve superuser bypass

-- First, let's identify and fix legacy documents with missing organization context
UPDATE ai_documents 
SET 
  context_level = CASE 
    WHEN organization_id = '00000000-0000-0000-0000-000000000000'::uuid THEN 'global'
    WHEN organization_id IS NOT NULL THEN 'organization'
    ELSE 'global'
  END,
  target_organization_id = CASE 
    WHEN organization_id = '00000000-0000-0000-0000-000000000000'::uuid THEN NULL
    WHEN organization_id IS NOT NULL THEN organization_id
    ELSE NULL
  END,
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'context_migration_applied', true,
    'context_migration_date', now()::text
  )
WHERE context_level IS NULL OR target_organization_id IS NULL;

-- Ensure all documents have a valid organization_id (use global if missing)
UPDATE ai_documents 
SET organization_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE organization_id IS NULL;

-- Update corresponding chunks to have consistent organization_id
UPDATE ai_document_chunks 
SET organization_id = d.organization_id
FROM ai_documents d
WHERE ai_document_chunks.document_id = d.id 
  AND ai_document_chunks.organization_id != d.organization_id;

-- Create a more robust superuser bypass function for document operations
CREATE OR REPLACE FUNCTION public.can_manage_document(doc_org_id uuid, doc_context_level text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Superuser bypass - can manage any document
  IF is_superuser() THEN
    RETURN TRUE;
  END IF;
  
  -- Global documents can be managed by backoffice admins
  IF doc_context_level = 'global' AND EXISTS (
    SELECT 1 FROM backoffice_admins WHERE user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Organization-specific document access
  RETURN EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = doc_org_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('admin', 'owner')
  );
END;
$$;

-- Update DELETE policies to use the new function and ensure superuser bypass
DROP POLICY IF EXISTS "Superuser and org admins can delete documents" ON ai_documents;
CREATE POLICY "Enhanced document delete access" 
ON ai_documents 
FOR DELETE 
USING (can_manage_document(organization_id, context_level));

DROP POLICY IF EXISTS "Superuser and org admins can delete versions" ON ai_document_versions;
CREATE POLICY "Enhanced version delete access"
ON ai_document_versions
FOR DELETE
USING (can_manage_document(organization_id));

DROP POLICY IF EXISTS "Superuser and org admins can delete chunks" ON ai_document_chunks;
CREATE POLICY "Enhanced chunk delete access"
ON ai_document_chunks  
FOR DELETE
USING (can_manage_document(organization_id));

-- Also update SELECT and UPDATE policies for consistency
DROP POLICY IF EXISTS "Superuser bypass for ai_documents" ON ai_documents;
CREATE POLICY "Enhanced document access control"
ON ai_documents
FOR ALL
USING (
  is_superuser() OR 
  user_can_view_organization(organization_id) OR
  user_can_access_organization_context(organization_id) OR
  (context_level = 'global' AND EXISTS (SELECT 1 FROM backoffice_admins WHERE user_id = auth.uid()))
)
WITH CHECK (
  is_superuser() OR 
  user_can_upload_to_organization(organization_id, auth.uid()) OR
  (context_level = 'global' AND EXISTS (SELECT 1 FROM backoffice_admins WHERE user_id = auth.uid()))
);

-- Log the migration
INSERT INTO audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  changed_by,
  change_reason
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'ai_documents',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'LEGACY_DOCUMENT_MIGRATION',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Backfilled missing metadata for legacy documents and enhanced superuser bypass for document management operations'
);