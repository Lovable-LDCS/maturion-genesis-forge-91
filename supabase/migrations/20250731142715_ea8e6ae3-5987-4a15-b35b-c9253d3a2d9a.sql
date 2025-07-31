-- Fix domain check constraint that's missing "Global Platform Logic"
DO $$ 
BEGIN
    -- Drop existing domain constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'ai_documents_domain_check'
    ) THEN
        ALTER TABLE ai_documents DROP CONSTRAINT ai_documents_domain_check;
    END IF;
    
    -- Drop existing domain constraint for ai_document_versions if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'ai_document_versions_domain_check'
    ) THEN
        ALTER TABLE ai_document_versions DROP CONSTRAINT ai_document_versions_domain_check;
    END IF;
END $$;

-- Add updated domain constraints with the full list including "Global Platform Logic"
ALTER TABLE ai_documents ADD CONSTRAINT ai_documents_domain_check 
CHECK (domain IN (
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
CHECK (domain IN (
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