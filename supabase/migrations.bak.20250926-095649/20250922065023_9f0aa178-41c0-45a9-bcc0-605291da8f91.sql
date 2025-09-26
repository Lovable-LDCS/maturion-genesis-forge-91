-- Add soft delete support to ai_documents table
ALTER TABLE public.ai_documents 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Add index for efficient queries filtering out deleted documents
CREATE INDEX idx_ai_documents_deleted_at ON public.ai_documents (deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Add index for active documents queries  
CREATE INDEX idx_ai_documents_active ON public.ai_documents (organization_id, created_at) 
WHERE deleted_at IS NULL;