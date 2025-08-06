-- Add is_ai_ingested flag to track AI availability
ALTER TABLE public.ai_documents 
ADD COLUMN is_ai_ingested BOOLEAN DEFAULT false;

-- Update existing completed documents to be marked as AI ingested
UPDATE public.ai_documents 
SET is_ai_ingested = true 
WHERE processing_status = 'completed' AND total_chunks > 0;

-- Create function to auto-update is_ai_ingested when processing completes
CREATE OR REPLACE FUNCTION public.update_ai_ingested_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-mark as AI ingested when processing completes with chunks
  IF NEW.processing_status = 'completed' AND NEW.total_chunks > 0 THEN
    NEW.is_ai_ingested = true;
  ELSIF NEW.processing_status IN ('pending', 'processing', 'failed') THEN
    NEW.is_ai_ingested = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update AI ingestion status
DROP TRIGGER IF EXISTS auto_update_ai_ingested ON public.ai_documents;
CREATE TRIGGER auto_update_ai_ingested
  BEFORE UPDATE ON public.ai_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_ingested_status();

-- Add index for faster filtering on AI ingested status
CREATE INDEX IF NOT EXISTS idx_ai_documents_is_ai_ingested 
ON public.ai_documents(is_ai_ingested, processing_status, organization_id);