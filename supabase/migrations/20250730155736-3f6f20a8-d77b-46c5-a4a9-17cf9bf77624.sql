-- Fix ai_document_versions constraint to include governance_reasoning_manifest
-- This allows governance documents to create version records properly

-- Drop the existing constraint
ALTER TABLE ai_document_versions DROP CONSTRAINT ai_document_versions_document_type_check;

-- Add the updated constraint with governance_reasoning_manifest included
ALTER TABLE ai_document_versions ADD CONSTRAINT ai_document_versions_document_type_check 
CHECK (document_type = ANY (ARRAY[
  'maturity_model'::text,
  'sector_context'::text, 
  'scoring_logic'::text,
  'sop_template'::text,
  'general'::text,
  'mps_document'::text,
  'iso_alignment'::text,
  'assessment_framework_component'::text,
  'ai_logic_rule_global'::text,
  'system_instruction'::text,
  'threat_intelligence_profile'::text,
  'governance_reasoning_manifest'::text  -- <- ADDED: This was missing!
]));