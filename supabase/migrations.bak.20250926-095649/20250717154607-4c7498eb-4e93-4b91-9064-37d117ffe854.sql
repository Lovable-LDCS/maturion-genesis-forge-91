-- Add new metadata fields to ai_documents table
ALTER TABLE public.ai_documents 
ADD COLUMN domain TEXT,
ADD COLUMN tags TEXT,
ADD COLUMN upload_notes TEXT;

-- Create index for domain filtering
CREATE INDEX idx_ai_documents_domain ON public.ai_documents(domain);

-- Update existing documents with NULL values for new fields (they're optional)
-- This ensures existing data remains valid