-- Admin function to reset MPS documents for reprocessing
-- This will clear all old data and reset documents to pending status

-- First, create a function to safely reset MPS documents for reprocessing
CREATE OR REPLACE FUNCTION reset_mps_documents_for_reprocessing(target_organization_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  doc_count INTEGER;
  criteria_count INTEGER;
  chunk_count INTEGER;
  result json;
BEGIN
  -- Count what we're about to reset
  SELECT COUNT(*) INTO doc_count
  FROM ai_documents 
  WHERE organization_id = target_organization_id 
    AND document_type = 'mps_document';
  
  SELECT COUNT(*) INTO criteria_count
  FROM criteria c
  JOIN maturity_practice_statements mps ON c.mps_id = mps.id
  WHERE mps.organization_id = target_organization_id;
  
  SELECT COUNT(*) INTO chunk_count
  FROM ai_document_chunks adc
  JOIN ai_documents ad ON adc.document_id = ad.id
  WHERE ad.organization_id = target_organization_id 
    AND ad.document_type = 'mps_document';
  
  -- Reset AI document chunks for MPS documents
  DELETE FROM ai_document_chunks 
  WHERE document_id IN (
    SELECT id FROM ai_documents 
    WHERE organization_id = target_organization_id 
      AND document_type = 'mps_document'
  );
  
  -- Clear old criteria tied to MPS documents
  DELETE FROM criteria 
  WHERE mps_id IN (
    SELECT id FROM maturity_practice_statements 
    WHERE organization_id = target_organization_id
  );
  
  -- Clear maturity levels associated with old criteria
  DELETE FROM maturity_levels 
  WHERE organization_id = target_organization_id;
  
  -- Clear assessment scores for old criteria
  DELETE FROM assessment_scores 
  WHERE organization_id = target_organization_id;
  
  -- Reset MPS documents to pending status
  UPDATE ai_documents 
  SET 
    processing_status = 'pending',
    processed_at = NULL,
    total_chunks = 0,
    updated_at = now()
  WHERE organization_id = target_organization_id 
    AND document_type = 'mps_document';
  
  -- Reset MPS status to not_started
  UPDATE maturity_practice_statements 
  SET 
    status = 'not_started',
    updated_at = now()
  WHERE organization_id = target_organization_id;
  
  -- Reset domain status to not_started
  UPDATE domains 
  SET 
    status = 'not_started',
    updated_at = now()
  WHERE organization_id = target_organization_id;
  
  -- Create audit log entry
  INSERT INTO audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  ) VALUES (
    target_organization_id,
    'ai_documents',
    target_organization_id,
    'bulk_reset',
    auth.uid(),
    'MPS documents reset for reprocessing with new AI Interpretation Rule'
  );
  
  -- Return summary of what was reset
  result := json_build_object(
    'success', true,
    'documents_reset', doc_count,
    'criteria_cleared', criteria_count,
    'chunks_cleared', chunk_count,
    'message', 'MPS documents successfully reset for reprocessing'
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reset_mps_documents_for_reprocessing(uuid) TO authenticated;

-- Create a simplified admin function that gets the user's organization automatically
CREATE OR REPLACE FUNCTION reset_my_mps_documents()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_org_id uuid;
  result json;
BEGIN
  -- Get the user's organization ID
  SELECT organization_id INTO user_org_id
  FROM organization_members 
  WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  LIMIT 1;
  
  IF user_org_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No organization found or insufficient permissions'
    );
  END IF;
  
  -- Call the main reset function
  SELECT reset_mps_documents_for_reprocessing(user_org_id) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reset_my_mps_documents() TO authenticated;