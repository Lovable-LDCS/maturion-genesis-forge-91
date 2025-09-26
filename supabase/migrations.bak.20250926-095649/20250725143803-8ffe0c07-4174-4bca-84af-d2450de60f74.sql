-- Add 'threat_intelligence_profile' to the ai_documents document_type constraint
ALTER TABLE public.ai_documents 
DROP CONSTRAINT IF EXISTS ai_documents_document_type_check;

ALTER TABLE public.ai_documents 
ADD CONSTRAINT ai_documents_document_type_check 
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
  'threat_intelligence_profile'::text
]));

-- Also update ai_document_versions table constraint if it exists
ALTER TABLE public.ai_document_versions 
DROP CONSTRAINT IF EXISTS ai_document_versions_document_type_check;

ALTER TABLE public.ai_document_versions 
ADD CONSTRAINT ai_document_versions_document_type_check 
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
  'threat_intelligence_profile'::text
]));