-- Add 'archived' as a valid processing status for ai_documents
ALTER TABLE public.ai_documents 
DROP CONSTRAINT ai_documents_processing_status_check;

ALTER TABLE public.ai_documents 
ADD CONSTRAINT ai_documents_processing_status_check 
CHECK (processing_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'archived'::text]));