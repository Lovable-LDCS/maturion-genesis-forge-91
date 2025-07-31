-- Fix ai_document_versions domains too
UPDATE ai_document_versions 
SET domain = 'Global Platform Logic'
WHERE domain LIKE '%Global Platform Logic%' OR domain LIKE '%global_platform_logic%';

UPDATE ai_document_versions 
SET domain = 'Global Instruction'
WHERE domain LIKE '%Global Instruction%' OR domain LIKE '%global_instruction%';

-- Now add the constraints with NULL allowed
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