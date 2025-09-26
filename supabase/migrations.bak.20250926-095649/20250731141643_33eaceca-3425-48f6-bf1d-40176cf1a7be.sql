-- Update document type constraints to support expanded list
DO $$ 
BEGIN
    -- Drop existing check constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'ai_documents_document_type_check'
    ) THEN
        ALTER TABLE ai_documents DROP CONSTRAINT ai_documents_document_type_check;
    END IF;
    
    -- Drop existing check constraint for ai_document_versions if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'ai_document_versions_document_type_check'
    ) THEN
        ALTER TABLE ai_document_versions DROP CONSTRAINT ai_document_versions_document_type_check;
    END IF;
END $$;

-- Add updated document type constraints
ALTER TABLE ai_documents ADD CONSTRAINT ai_documents_document_type_check 
CHECK (document_type IN (
    'guidance_document',
    'mps_document', 
    'best_practice',
    'case_study',
    'template',
    'checklist',
    'governance_reasoning_manifest',
    'scoring_logic',
    'assessment_framework_component',
    'ai_logic_rule_global',
    'threat_intelligence_profile',
    'policy_model',
    'sop_procedure',
    'policy_statement',
    'evidence_sample',
    'training_module',
    'awareness_material',
    'implementation_guide',
    'tool_reference',
    'audit_template',
    'use_case_scenario',
    'evaluation_rubric',
    'data_model',
    'decision_tree_logic',
    'general',
    'maturity_model'
));

ALTER TABLE ai_document_versions ADD CONSTRAINT ai_document_versions_document_type_check 
CHECK (document_type IN (
    'guidance_document',
    'mps_document', 
    'best_practice',
    'case_study',
    'template',
    'checklist',
    'governance_reasoning_manifest',
    'scoring_logic',
    'assessment_framework_component',
    'ai_logic_rule_global',
    'threat_intelligence_profile',
    'policy_model',
    'sop_procedure',
    'policy_statement',
    'evidence_sample',
    'training_module',
    'awareness_material',
    'implementation_guide',
    'tool_reference',
    'audit_template',
    'use_case_scenario',
    'evaluation_rubric',
    'data_model',
    'decision_tree_logic',
    'general',
    'maturity_model'
));

-- Update approved_chunks_cache table if it has document type constraints
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'approved_chunks_cache_document_type_check'
    ) THEN
        ALTER TABLE approved_chunks_cache DROP CONSTRAINT approved_chunks_cache_document_type_check;
    END IF;
END $$;