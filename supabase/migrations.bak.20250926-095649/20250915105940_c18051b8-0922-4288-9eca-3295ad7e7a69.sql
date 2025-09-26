-- Add missing columns to ai_documents for training slide support
ALTER TABLE ai_documents 
ADD COLUMN IF NOT EXISTS doc_type TEXT,
ADD COLUMN IF NOT EXISTS layer SMALLINT,
ADD COLUMN IF NOT EXISTS stage TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload',
ADD COLUMN IF NOT EXISTS bucket_id TEXT,
ADD COLUMN IF NOT EXISTS object_path TEXT,
ADD COLUMN IF NOT EXISTS size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS error TEXT;

-- Add missing columns to ai_document_chunks for enhanced metadata
ALTER TABLE ai_document_chunks
ADD COLUMN IF NOT EXISTS tokens INTEGER,
ADD COLUMN IF NOT EXISTS page INTEGER,
ADD COLUMN IF NOT EXISTS section TEXT,
ADD COLUMN IF NOT EXISTS equipment_slugs TEXT[],
ADD COLUMN IF NOT EXISTS stage TEXT,
ADD COLUMN IF NOT EXISTS layer SMALLINT,
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Performance indexes for ai_documents
CREATE INDEX IF NOT EXISTS ai_docs_org_idx ON ai_documents(organization_id);
CREATE INDEX IF NOT EXISTS ai_docs_stage_idx ON ai_documents(stage);
CREATE INDEX IF NOT EXISTS ai_docs_layer_idx ON ai_documents(layer);
CREATE INDEX IF NOT EXISTS ai_docs_doc_type_idx ON ai_documents(doc_type);
CREATE INDEX IF NOT EXISTS ai_docs_processing_status_idx ON ai_documents(processing_status);
CREATE INDEX IF NOT EXISTS ai_docs_tags_gin ON ai_documents USING gin(tags);
CREATE INDEX IF NOT EXISTS ai_docs_metadata_gin ON ai_documents USING gin(metadata jsonb_path_ops);

-- Performance indexes for ai_document_chunks
CREATE INDEX IF NOT EXISTS ai_chunks_org_idx ON ai_document_chunks(organization_id);
CREATE INDEX IF NOT EXISTS ai_chunks_layer_idx ON ai_document_chunks(layer);
CREATE INDEX IF NOT EXISTS ai_chunks_stage_idx ON ai_document_chunks(stage);
CREATE INDEX IF NOT EXISTS ai_chunks_equipment_gin ON ai_document_chunks USING gin(equipment_slugs);
CREATE INDEX IF NOT EXISTS ai_chunks_tags_gin ON ai_document_chunks USING gin(tags);

-- Update existing documents to have proper doc_type based on patterns
UPDATE ai_documents 
SET doc_type = CASE 
  WHEN file_name ILIKE '%organization%profile%' OR title ILIKE '%organization%profile%' THEN 'organization_profile'
  WHEN file_name ILIKE '%diamond%knowledge%' OR title ILIKE '%diamond%knowledge%' THEN 'diamond_knowledge_pack'
  WHEN document_type = 'web_crawl' THEN 'web_crawl'
  WHEN file_name ILIKE '%.ppt%' OR mime_type LIKE '%powerpoint%' THEN 'training_slide'
  ELSE 'general'
END
WHERE doc_type IS NULL;

-- Set layer based on doc_type
UPDATE ai_documents 
SET layer = CASE 
  WHEN doc_type = 'training_slide' THEN 3
  WHEN doc_type = 'diamond_knowledge_pack' THEN 2
  WHEN doc_type = 'organization_profile' THEN 1
  ELSE 2
END
WHERE layer IS NULL;

-- Set source for existing documents
UPDATE ai_documents 
SET source = CASE 
  WHEN document_type = 'web_crawl' THEN 'crawl'
  ELSE 'upload'
END
WHERE source IS NULL;