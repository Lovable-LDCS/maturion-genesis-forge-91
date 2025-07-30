-- Update ai_documents document_type check constraint to include all existing types plus the new one
ALTER TABLE public.ai_documents 
DROP CONSTRAINT IF EXISTS ai_documents_document_type_check;

ALTER TABLE public.ai_documents 
ADD CONSTRAINT ai_documents_document_type_check 
CHECK (document_type IN (
  'mps_document', 
  'guidance_document', 
  'best_practice', 
  'case_study', 
  'template', 
  'checklist', 
  'governance_reasoning_manifest',
  'scoring_logic',
  'assessment_framework_component',
  'ai_logic_rule_global',
  'threat_intelligence_profile',
  'general',
  'maturity_model'
));