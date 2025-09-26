-- Fix the search context by updating document type filtering
-- The issue is that documents are marked as 'mps_document' but search uses 'mps'

-- First, let's check what document types are being searched for
-- Update the ai_documents to have consistent document type naming
UPDATE ai_documents 
SET document_type = 'mps'
WHERE document_type = 'mps_document' 
  AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
  AND title ~ 'MPS [0-9]+';

-- Add MPS number to metadata for better searchability
UPDATE ai_documents 
SET metadata = metadata || 
  jsonb_build_object(
    'mps_number', 
    CAST(REGEXP_REPLACE(title, '.*MPS ([0-9]+).*', '\1') AS INTEGER)
  )
WHERE document_type = 'mps' 
  AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
  AND title ~ 'MPS [0-9]+';

-- Update document chunks to reference the correct document type
UPDATE ai_document_chunks 
SET metadata = metadata || jsonb_build_object('document_type', 'mps')
WHERE document_id IN (
  SELECT id FROM ai_documents 
  WHERE document_type = 'mps' 
    AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
);

-- Create better search tags for the documents
UPDATE ai_documents 
SET tags = CONCAT(
  'mps-', 
  REGEXP_REPLACE(title, '.*MPS ([0-9]+).*', '\1'),
  ', ',
  LOWER(REGEXP_REPLACE(title, 'MPS [0-9]+ – ', '')),
  ', ',
  COALESCE(tags, '')
)
WHERE document_type = 'mps' 
  AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
  AND title ~ 'MPS [0-9]+';