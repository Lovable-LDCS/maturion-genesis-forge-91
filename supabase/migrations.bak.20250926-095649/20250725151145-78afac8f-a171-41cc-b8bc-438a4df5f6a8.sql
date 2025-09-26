-- Continue fixing remaining function search path issues
-- Let's check what functions still need fixing and skip the milestone functions for now

CREATE OR REPLACE FUNCTION public.calculate_assessment_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  total_criteria INTEGER;
  completed_criteria INTEGER;
  completion_pct DECIMAL(5,2);
BEGIN
  -- Count total criteria for this assessment
  SELECT COUNT(*) INTO total_criteria
  FROM public.criteria c
  JOIN public.maturity_practice_statements mps ON c.mps_id = mps.id
  JOIN public.domains d ON mps.domain_id = d.id
  WHERE d.organization_id = NEW.organization_id;
  
  -- Count completed criteria (approved status)
  SELECT COUNT(*) INTO completed_criteria
  FROM public.assessment_scores
  WHERE assessment_id = NEW.assessment_id 
    AND status = 'approved_locked';
  
  -- Calculate percentage
  IF total_criteria > 0 THEN
    completion_pct := (completed_criteria::DECIMAL / total_criteria::DECIMAL) * 100;
  ELSE
    completion_pct := 0;
  END IF;
  
  -- Update assessment completion percentage
  UPDATE public.assessments 
  SET overall_completion_percentage = completion_pct,
      updated_at = now()
  WHERE id = NEW.assessment_id;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_milestone_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.milestone_status_history (
      entity_type,
      entity_id,
      organization_id,
      old_status,
      new_status,
      change_reason,
      changed_by
    ) VALUES (
      CASE WHEN TG_TABLE_NAME = 'milestones' THEN 'milestone' ELSE 'task' END,
      NEW.id,
      NEW.organization_id,
      OLD.status,
      NEW.status,
      'Status updated via application',
      NEW.updated_by
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_document_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  max_version INTEGER;
BEGIN
  -- Only create version if this is an update (not insert)
  IF TG_OP = 'UPDATE' THEN
    -- Get the current max version for this document
    SELECT COALESCE(MAX(version_number), 0) INTO max_version
    FROM public.ai_document_versions 
    WHERE document_id = OLD.id;
    
    -- Create new version record with previous data
    INSERT INTO public.ai_document_versions (
      document_id,
      version_number,
      title,
      domain,
      tags,
      upload_notes,
      document_type,
      metadata,
      file_path,
      file_name,
      file_size,
      mime_type,
      created_by,
      organization_id,
      change_reason
    ) VALUES (
      OLD.id,
      max_version + 1,
      OLD.title,
      OLD.domain,
      OLD.tags,
      OLD.upload_notes,
      OLD.document_type,
      OLD.metadata,
      OLD.file_path,
      OLD.file_name,
      OLD.file_size,
      OLD.mime_type,
      NEW.updated_by,
      OLD.organization_id,
      COALESCE(NEW.metadata->>'change_reason', 'Document updated')
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_mps_documents_for_reprocessing(target_organization_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  doc_count INTEGER;
  criteria_count INTEGER;
  chunk_count INTEGER;
  result json;
  executing_user_id uuid;
BEGIN
  -- Get executing user or use a system placeholder
  executing_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
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
  
  -- Create audit log entry with fallback user
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
    executing_user_id,
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
$function$;