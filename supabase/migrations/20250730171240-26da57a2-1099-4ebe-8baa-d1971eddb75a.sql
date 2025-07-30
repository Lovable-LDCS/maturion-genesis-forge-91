-- Update metadata for AI Logic documents with zero chunks
UPDATE ai_documents 
SET 
  document_type = 'ai_logic_rule_global',
  domain = 'Global Platform Logic – applies to all AI components, MPS logic, user pages, and guidance systems',
  tags = 'AI Core Logic, Validation Rules, Emergency Processing, System Reasoning, Governance Anchor',
  processing_status = 'pending',
  total_chunks = 0,
  processed_at = NULL,
  updated_at = now()
WHERE document_type = 'ai_logic_rule_global' 
  AND total_chunks = 0 
  AND processing_status = 'processing';

-- Also update assessment_framework_component documents that appear to be AI logic related
UPDATE ai_documents 
SET 
  document_type = 'ai_logic_rule_global',
  domain = 'Global Platform Logic – applies to all AI components, MPS logic, user pages, and guidance systems',
  tags = 'AI Core Logic, Validation Rules, Emergency Processing, System Reasoning, Governance Anchor',
  processing_status = 'pending',
  total_chunks = 0,
  processed_at = NULL,
  updated_at = now()
WHERE document_type = 'assessment_framework_component' 
  AND (title ILIKE '%AI%' OR file_name ILIKE '%AI%')
  AND total_chunks = 0 
  AND processing_status = 'processing';