-- AI DOCUMENT INGESTION & VALIDATION POLICY - REPROCESSING MIGRATION
-- This migration implements the AI Policy rules for existing documents

-- 1. DELETE ALL CORRUPTED CHUNKS FROM EXISTING DOCUMENTS
-- Remove chunks that violate the AI Policy standards
DELETE FROM ai_document_chunks 
WHERE 
  -- Chunks below minimum size (1500 chars)
  length(content) < 1500
  OR
  -- Chunks with XML artifacts from DOCX metadata
  (content LIKE '%_rels/%' OR content LIKE '%customXml/%' OR content LIKE '%word/_rels%' OR content LIKE '%.xml.rels%' OR content LIKE '%tomXml/%')
  OR
  -- Chunks with excessive binary content (>30%)
  (length(content) - length(regexp_replace(content, '[^\x20-\x7E]', '', 'g'))) / length(content)::float > 0.3
  OR
  -- Chunks with encoding corruption patterns
  (content LIKE '%\\\\\\\\%' AND (length(content) - length(replace(content, '?', ''))) / length(content)::float > 0.2);

-- 2. RESET DOCUMENTS WITH NO VALID CHUNKS FOR REPROCESSING
-- Reset documents that now have no chunks after corruption cleanup
UPDATE ai_documents 
SET 
  processing_status = 'pending',
  processed_at = NULL,
  total_chunks = 0,
  updated_at = now(),
  metadata = jsonb_set(
    COALESCE(metadata, '{}'),
    '{ai_policy_cleanup}',
    'true'
  )
WHERE id IN (
  SELECT ad.id 
  FROM ai_documents ad
  LEFT JOIN ai_document_chunks adc ON ad.id = adc.document_id
  WHERE ad.document_type = 'mps_document'
    AND ad.processing_status = 'completed'
    AND adc.id IS NULL
);

-- 3. UPDATE CHUNK COUNTS FOR REMAINING DOCUMENTS
-- Update total_chunks count for documents that still have valid chunks
UPDATE ai_documents 
SET 
  total_chunks = (
    SELECT COUNT(*) 
    FROM ai_document_chunks 
    WHERE document_id = ai_documents.id
  ),
  updated_at = now(),
  metadata = jsonb_set(
    COALESCE(metadata, '{}'),
    '{ai_policy_cleanup}',
    'true'
  )
WHERE document_type = 'mps_document' 
  AND processing_status = 'completed';

-- 4. CREATE AUDIT LOG ENTRY
INSERT INTO audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  changed_by,
  change_reason
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'ai_document_chunks',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'AI_POLICY_CLEANUP',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Applied AI Document Ingestion & Validation Policy: Removed corrupted chunks, enforced 1500-char minimum, reset failed documents for reprocessing'
);