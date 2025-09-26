-- PHASE 2: MAMMOTH.JS INTEGRATION & CORRUPTION CLEANUP
-- Reset all MPS documents with corrupted chunks for reprocessing with enhanced Mammoth.js

-- 1. LOG THE PHASE 2 OPERATION
INSERT INTO audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  changed_by,
  change_reason
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'ai_documents',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'PHASE_2_MAMMOTH_INTEGRATION',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Phase 2: Enhanced Mammoth.js integration - resetting MPS documents for clean reprocessing'
);

-- 2. DELETE ALL EXISTING MPS DOCUMENT CHUNKS
-- Clear all chunks from MPS documents to ensure clean reprocessing
DELETE FROM ai_document_chunks 
WHERE document_id IN (
  SELECT id FROM ai_documents 
  WHERE document_type = 'mps_document'
);

-- 3. RESET ALL MPS DOCUMENTS TO PENDING STATUS
-- Force reprocessing through enhanced Mammoth.js pipeline
UPDATE ai_documents 
SET 
  processing_status = 'pending',
  processed_at = NULL,
  total_chunks = 0,
  updated_at = now(),
  metadata = jsonb_set(
    COALESCE(metadata, '{}'),
    '{mammoth_integration_reset}',
    'true'
  )
WHERE document_type = 'mps_document';

-- 4. LOG POLICY CHANGE IN POLICY CHANGE LOG
INSERT INTO policy_change_log (
  title,
  type,
  domain_scope,
  summary,
  tags,
  logged_by,
  organization_id,
  metadata
) VALUES (
  'Mammoth.js Integration Enforcement',
  'AI_PROCESSING_ENHANCEMENT',
  'Document Processing',
  'Enhanced document processing pipeline with strict Mammoth.js integration for DOCX files. Implemented restrictive fallback validation to prevent corrupted content storage. All MPS documents reset for reprocessing with new AI Policy standards.',
  ARRAY['mammoth', 'docx', 'corruption-prevention', 'ai-policy', 'document-processing'],
  'System',
  NULL,
  jsonb_build_object(
    'phase', 'Phase 2',
    'implementation_date', now(),
    'features', ARRAY[
      'Enhanced Mammoth.js extraction with ZIP signature validation',
      'Strict corruption detection and blocking',
      'Restrictive fallback validation (1500+ chars, no XML artifacts)',
      'AI Policy enforcement before chunk storage',
      'Comprehensive extraction quality metrics'
    ],
    'impact', 'All MPS documents reset for clean reprocessing',
    'success_criteria', ARRAY[
      'No XML artifacts in chunks',
      'All chunks ≥1500 characters',
      'Readable text extraction only',
      'Mammoth.js primary extraction method'
    ]
  )
);