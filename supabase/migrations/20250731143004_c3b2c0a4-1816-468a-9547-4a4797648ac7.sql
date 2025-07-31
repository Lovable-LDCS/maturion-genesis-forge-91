-- Fix domain constraint issue by updating existing data first

-- Drop constraints using proper syntax
ALTER TABLE ai_documents DROP CONSTRAINT IF EXISTS ai_documents_domain_check;
ALTER TABLE ai_document_versions DROP CONSTRAINT IF EXISTS ai_document_versions_domain_check;

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