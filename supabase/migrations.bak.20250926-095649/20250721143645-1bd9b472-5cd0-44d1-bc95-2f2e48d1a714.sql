-- Simplified reset function without audit log to avoid constraint issues
CREATE OR REPLACE FUNCTION public.reset_failed_document(doc_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete any existing chunks for this document
  DELETE FROM public.ai_document_chunks WHERE document_id = doc_id;
  
  -- Reset the document status to pending
  UPDATE public.ai_documents 
  SET processing_status = 'pending',
      processed_at = NULL,
      total_chunks = 0,
      updated_at = now()
  WHERE id = doc_id;
  
  RETURN TRUE;
END;
$$;