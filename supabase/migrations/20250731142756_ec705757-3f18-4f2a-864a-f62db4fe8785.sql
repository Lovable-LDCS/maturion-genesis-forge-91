-- Update existing domains to match the new constraint format
UPDATE ai_documents 
SET domain = CASE 
    WHEN domain LIKE 'Global Platform Logic%' THEN 'Global Platform Logic'
    WHEN domain LIKE 'Global Instruction%' THEN 'Global Instruction'
    WHEN domain = 'Leadership & Governance' THEN 'Leadership & Governance'
    WHEN domain = 'People & Culture' THEN 'People & Culture'
    WHEN domain = 'Process Integrity' THEN 'Process Integrity'
    WHEN domain = 'Protection' THEN 'Protection'
    WHEN domain = 'Proof it Works' THEN 'Proof it Works'
    ELSE domain
END
WHERE domain IS NOT NULL;

-- Also update ai_document_versions if any exist
UPDATE ai_document_versions 
SET domain = CASE 
    WHEN domain LIKE 'Global Platform Logic%' THEN 'Global Platform Logic'
    WHEN domain LIKE 'Global Instruction%' THEN 'Global Instruction'
    WHEN domain = 'Leadership & Governance' THEN 'Leadership & Governance'
    WHEN domain = 'People & Culture' THEN 'People & Culture'
    WHEN domain = 'Process Integrity' THEN 'Process Integrity'
    WHEN domain = 'Protection' THEN 'Protection'
    WHEN domain = 'Proof it Works' THEN 'Proof it Works'
    ELSE domain
END
WHERE domain IS NOT NULL;

-- Now add the domain constraints
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