-- Add 'ai_logic_rule_global' to the document_type check constraint
ALTER TABLE ai_documents 
DROP CONSTRAINT ai_documents_document_type_check;

ALTER TABLE ai_documents 
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
    'ai_logic_rule_global'::text
]));