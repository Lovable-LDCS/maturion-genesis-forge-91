-- Function to regenerate missing embeddings for an organization
CREATE OR REPLACE FUNCTION regenerate_missing_embeddings_for_org(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  missing_count integer;
  total_count integer;
  result jsonb;
BEGIN
  -- Count chunks without embeddings
  SELECT COUNT(*) INTO missing_count
  FROM ai_document_chunks 
  WHERE organization_id = org_id 
    AND embedding IS NULL
    AND content IS NOT NULL
    AND length(trim(content)) > 0;
    
  SELECT COUNT(*) INTO total_count
  FROM ai_document_chunks 
  WHERE organization_id = org_id;
  
  -- Log the need for regeneration
  INSERT INTO audit_trail (
    organization_id,
    table_name, 
    record_id,
    action,
    changed_by,
    change_reason
  ) VALUES (
    org_id,
    'ai_document_chunks',
    org_id,
    'EMBEDDING_REGENERATION_REQUESTED',
    '00000000-0000-0000-0000-000000000001'::uuid,
    format('Found %s chunks without embeddings out of %s total chunks', missing_count, total_count)
  );
  
  result := jsonb_build_object(
    'organization_id', org_id,
    'total_chunks', total_count,
    'missing_embeddings', missing_count,
    'embedding_percentage', round(100.0 * (total_count - missing_count) / NULLIF(total_count, 0), 2),
    'needs_regeneration', missing_count > 0
  );
  
  RETURN result;
END;
$$;