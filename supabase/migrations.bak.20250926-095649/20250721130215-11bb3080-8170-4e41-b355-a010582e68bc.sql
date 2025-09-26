-- Reset processing status for stuck documents
UPDATE ai_documents 
SET processing_status = 'pending' 
WHERE processing_status = 'processing';