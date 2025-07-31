-- Drop any existing domain constraints first
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'ai_documents_domain_check'
    ) THEN
        ALTER TABLE ai_documents DROP CONSTRAINT ai_documents_domain_check;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'ai_document_versions_domain_check'
    ) THEN
        ALTER TABLE ai_document_versions DROP CONSTRAINT ai_document_versions_domain_check;
    END IF;
END $$;

-- Normalize all existing domain values to match the constraint
UPDATE ai_documents 
SET domain = 'Global Platform Logic'
WHERE domain LIKE '%Global Platform Logic%' OR domain LIKE '%global_platform_logic%';

UPDATE ai_documents 
SET domain = 'Global Instruction'
WHERE domain LIKE '%Global Instruction%' OR domain LIKE '%global_instruction%';

-- Now verify all domains are valid before adding constraint
UPDATE ai_documents SET domain = 'Global Platform Logic' WHERE domain = 'Global Platform Logic';

-- Finally add the constraints with NULL allowed
ALTER TABLE ai_documents ADD CONSTRAINT ai_documents_domain_check 
CHECK (domain IS NULL OR domain IN (
    'Leadership & Governance',
    'People & Culture', 
    'Process Integrity',
    'Protection',
    'Proof it Works',
    'Global Platform Logic',
    'Global Instruction',
    'Control Environment',
    'Surveillance & Monitoring',
    'System Integrity & Infrastructure',
    'Incident Management',
    'Training & Awareness',
    'Third-Party Risk',
    'Legal & Compliance',
    'Threat Environment',
    'Assessment & Evidence Logic',
    'Analytics & Reporting',
    'AI Governance',
    'Maturion Engine Logic'
));

ALTER TABLE ai_document_versions ADD CONSTRAINT ai_document_versions_domain_check 
CHECK (domain IS NULL OR domain IN (
    'Leadership & Governance',
    'People & Culture', 
    'Process Integrity',
    'Protection',
    'Proof it Works',
    'Global Platform Logic',
    'Global Instruction',
    'Control Environment',
    'Surveillance & Monitoring',
    'System Integrity & Infrastructure',
    'Incident Management',
    'Training & Awareness',
    'Third-Party Risk',
    'Legal & Compliance',
    'Threat Environment',
    'Assessment & Evidence Logic',
    'Analytics & Reporting',
    'AI Governance',
    'Maturion Engine Logic'
));