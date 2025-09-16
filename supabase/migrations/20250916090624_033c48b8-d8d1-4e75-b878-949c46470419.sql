-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Cosine-similarity retriever for Maturion Chat
CREATE OR REPLACE FUNCTION public.match_ai_chunks(
  p_org_id uuid,
  p_query_embedding vector(1536),
  p_match_count int DEFAULT 8,
  p_min_score float DEFAULT 0.0
)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  document_title text,
  doc_type text,
  score float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    adc.id,
    adc.document_id,
    adc.content,
    adc.chunk_index,
    ad.title AS document_title,
    ad.document_type AS doc_type,
    1 - (adc.embedding <=> p_query_embedding) AS score
  FROM public.ai_document_chunks adc
  JOIN public.ai_documents ad ON ad.id = adc.document_id
  WHERE ad.organization_id = p_org_id
    AND adc.organization_id = p_org_id
    AND adc.embedding IS NOT NULL
    AND COALESCE(ad.processing_status, 'completed') = 'completed'
  ORDER BY adc.embedding <=> p_query_embedding
  LIMIT p_match_count
$$;

-- Index already exists as HNSW; skip creating another
-- (left intentionally blank)

-- Update table statistics for query planner
ANALYZE public.ai_document_chunks;