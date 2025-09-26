-- Force regeneration of all embeddings
-- This will update chunks in batches to trigger re-embedding

-- Create a function to mark all chunks for re-embedding
CREATE OR REPLACE FUNCTION mark_chunks_for_reembedding()
RETURNS TABLE(updated_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count bigint;
BEGIN
  -- Update metadata to trigger re-embedding for chunks without embeddings
  UPDATE ai_document_chunks 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"needs_embedding": true, "last_updated": "' || now()::text || '"}'
  WHERE embedding IS NULL 
    AND content IS NOT NULL 
    AND length(trim(content)) > 0;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log the action
  INSERT INTO audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  ) 
  SELECT DISTINCT
    ad.organization_id,
    'ai_document_chunks',
    ad.organization_id,
    'embedding_regeneration_triggered',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Marked ' || updated_count || ' chunks for embedding regeneration'
  FROM ai_document_chunks adc
  JOIN ai_documents ad ON adc.document_id = ad.id
  WHERE adc.embedding IS NULL
    AND adc.content IS NOT NULL
    AND length(trim(adc.content)) > 0;
  
  RETURN QUERY SELECT updated_count;
END;
$$;

-- Execute the function
SELECT * FROM mark_chunks_for_reembedding();