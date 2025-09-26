-- Add document type constraint to support 'best_practice' and other document types
DO $$
BEGIN
  -- Drop existing constraint if it exists on ai_documents table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ai_documents_document_type_check' 
    AND table_name = 'ai_documents'
  ) THEN
    ALTER TABLE ai_documents DROP CONSTRAINT ai_documents_document_type_check;
  END IF;
  
  -- Add new constraint for document_type field in ai_documents table
  ALTER TABLE ai_documents 
  ADD CONSTRAINT ai_documents_document_type_check 
  CHECK (
    document_type IN (
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
      'maturity_model',
      'general'
    )
  );
END $$;