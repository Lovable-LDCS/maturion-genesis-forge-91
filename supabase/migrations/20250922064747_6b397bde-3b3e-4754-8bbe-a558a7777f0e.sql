-- Add soft delete support to ai_documents table
ALTER TABLE public.ai_documents 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Add index for efficient queries filtering out deleted documents
CREATE INDEX CONCURRENTLY idx_ai_documents_deleted_at ON public.ai_documents (deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Add index for active documents queries
CREATE INDEX CONCURRENTLY idx_ai_documents_active ON public.ai_documents (organization_id, created_at) 
WHERE deleted_at IS NULL;

-- Create audit log view for easier change log access
CREATE VIEW public.document_change_log AS
SELECT 
  aul.document_id,
  aul.action,
  aul.created_at as changed_at,
  aul.user_id as changed_by,
  aul.metadata,
  ad.title as document_title,
  ad.file_name as document_file_name,
  ad.organization_id
FROM public.ai_upload_audit aul
JOIN public.ai_documents ad ON aul.document_id = ad.id
ORDER BY aul.created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.document_change_log TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Users can access their organization's document change log" 
ON public.document_change_log 
FOR SELECT 
USING (user_can_view_organization(organization_id));