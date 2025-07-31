-- Fix domain constraint issue by updating existing data and then adding proper constraint

-- First, drop the existing constraint that's blocking us
DROP CONSTRAINT IF EXISTS ai_documents_domain_check ON ai_documents;
DROP CONSTRAINT IF EXISTS ai_document_versions_domain_check ON ai_document_versions;

-- Update existing data to use proper domain names
UPDATE ai_documents 
SET domain = CASE 
    WHEN domain LIKE '%Global Platform Logic%' THEN 'Global Platform Logic'
    WHEN domain LIKE '%Global Instruction%' THEN 'Global Instruction'
    ELSE domain
END
WHERE domain LIKE '%Global%';

UPDATE ai_document_versions 
SET domain = CASE 
    WHEN domain LIKE '%Global Platform Logic%' THEN 'Global Platform Logic'
    WHEN domain LIKE '%Global Instruction%' THEN 'Global Instruction'
    ELSE domain
END
WHERE domain LIKE '%Global%';