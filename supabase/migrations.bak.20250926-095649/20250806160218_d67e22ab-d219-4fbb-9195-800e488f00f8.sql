-- Create a function to regenerate embeddings for chunks without embeddings
CREATE OR REPLACE FUNCTION regenerate_missing_embeddings()
RETURNS TABLE(chunks_updated bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count bigint;
BEGIN
  -- Count chunks that need embeddings
  SELECT COUNT(*) INTO updated_count
  FROM ai_document_chunks
  WHERE embedding IS NULL
    AND content IS NOT NULL
    AND length(trim(content)) > 0;
  
  -- Log the embedding regeneration need
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
    'embedding_regeneration_needed',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Found ' || updated_count || ' chunks without embeddings that need regeneration'
  FROM ai_document_chunks adc
  JOIN ai_documents ad ON adc.document_id = ad.id
  WHERE adc.embedding IS NULL
    AND adc.content IS NOT NULL
    AND length(trim(adc.content)) > 0;
  
  RETURN QUERY SELECT updated_count;
END;
$$;

-- Execute the function to log embedding status
SELECT * FROM regenerate_missing_embeddings();