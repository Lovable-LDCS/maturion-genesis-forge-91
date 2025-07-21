-- Fix the reset function to use valid action types
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
  
  -- Create audit log using valid action type
  INSERT INTO public.ai_upload_audit (
    organization_id,
    document_id,
    action,
    user_id,
    metadata
  )
  SELECT 
    organization_id,
    id,
    'reprocess',
    uploaded_by,
    jsonb_build_object(
      'reset_reason', 'Manual intervention for persistent failure',
      'reset_at', now()
    )
  FROM public.ai_documents 
  WHERE id = doc_id;
  
  RETURN TRUE;
END;
$$;