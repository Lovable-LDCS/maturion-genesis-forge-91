-- Reset all MPS documents to pending status for reprocessing
-- Delete existing chunks first
DELETE FROM ai_document_chunks 
WHERE document_id IN (
  SELECT id FROM ai_documents 
  WHERE organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d' 
    AND document_type = 'mps_document'
);

-- Reset documents to pending status  
UPDATE ai_documents 
SET 
  processing_status = 'pending',
  processed_at = NULL,
  total_chunks = 0,
  updated_at = now()
WHERE organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d' 
  AND document_type = 'mps_document';