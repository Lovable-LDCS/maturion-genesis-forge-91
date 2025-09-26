-- Add new document types to the ai_documents table
ALTER TABLE public.ai_documents 
DROP CONSTRAINT ai_documents_document_type_check;

ALTER TABLE public.ai_documents 
ADD CONSTRAINT ai_documents_document_type_check 
CHECK (document_type IN (
  'maturity_model', 
  'sector_context', 
  'scoring_logic', 
  'sop_template', 
  'general',
  'mps_document',
  'iso_alignment',
  'assessment_framework_component'
));