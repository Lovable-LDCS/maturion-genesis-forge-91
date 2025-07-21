-- Reset stuck processing documents back to pending
UPDATE ai_documents 
SET processing_status = 'pending', 
    processed_at = NULL,
    total_chunks = 0
WHERE processing_status = 'processing';