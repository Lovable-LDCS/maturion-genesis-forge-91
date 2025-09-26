-- Create function to efficiently count chunks and embeddings by organization
CREATE OR REPLACE FUNCTION count_chunks_by_organization(org_id uuid)
RETURNS TABLE(
  total_chunks bigint,
  chunks_with_embeddings bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings
  FROM ai_document_chunks adc
  WHERE adc.organization_id = org_id;
END;
$$;