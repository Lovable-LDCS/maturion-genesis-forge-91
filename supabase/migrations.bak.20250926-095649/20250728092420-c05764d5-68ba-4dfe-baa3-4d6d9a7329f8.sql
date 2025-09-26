-- Add MPS number metadata to improve search targeting
UPDATE ai_documents 
SET metadata = metadata || 
  jsonb_build_object(
    'mps_number', 
    CAST(REGEXP_REPLACE(title, '.*MPS ([0-9]+).*', '\1') AS INTEGER),
    'searchable_content', title || ' ' || COALESCE(tags, ''),
    'domain_name', COALESCE(metadata->>'domain', 'Unknown'),
    'is_mps_document', true
  )
WHERE document_type = 'mps_document' 
  AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
  AND title ~ 'MPS [0-9]+';

-- Update chunks to include MPS information in their metadata
UPDATE ai_document_chunks 
SET metadata = metadata || 
  jsonb_build_object(
    'mps_number', 
    CAST(REGEXP_REPLACE(d.title, '.*MPS ([0-9]+).*', '\1') AS INTEGER),
    'document_title', d.title,
    'domain_name', COALESCE(d.metadata->>'domain', 'Unknown'),
    'is_mps_chunk', true
  )
FROM ai_documents d
WHERE ai_document_chunks.document_id = d.id
  AND d.document_type = 'mps_document' 
  AND d.organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
  AND d.title ~ 'MPS [0-9]+';

-- Create better content indexing by adding searchable content to chunks
UPDATE ai_document_chunks 
SET content = CASE 
  WHEN LENGTH(content) < 300 THEN 
    content || E'\n\nDocument: ' || d.title || 
    E'\nDomain: ' || COALESCE(d.metadata->>'domain', 'Unknown') ||
    E'\nTags: ' || COALESCE(d.tags, '') ||
    E'\nUpload Notes: ' || COALESCE(d.upload_notes, '')
  ELSE content
END
FROM ai_documents d
WHERE ai_document_chunks.document_id = d.id
  AND d.document_type = 'mps_document' 
  AND d.organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
  AND d.title ~ 'MPS [0-9]+';