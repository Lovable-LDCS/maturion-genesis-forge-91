-- Reset all failed documents to pending for reprocessing
UPDATE ai_documents 
SET processing_status = 'pending', 
    processed_at = NULL,
    total_chunks = 0,
    updated_at = now()
WHERE processing_status = 'failed';