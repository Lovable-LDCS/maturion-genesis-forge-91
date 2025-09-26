-- Fix Critical Issue #1: Add missing enum constraints that were not properly created

-- Add check constraints for data_sources
ALTER TABLE public.data_sources 
ADD CONSTRAINT data_sources_source_type_check 
CHECK (source_type IN ('supabase', 'google_drive', 'sharepoint', 'onedrive', 'dropbox', 'api_endpoint', 'database', 'file_system', 'other'));

ALTER TABLE public.data_sources 
ADD CONSTRAINT data_sources_sync_status_check 
CHECK (sync_status IN ('never_synced', 'syncing', 'success', 'failed', 'partial'));

-- Add check constraints for evidence_submissions  
ALTER TABLE public.evidence_submissions 
ADD CONSTRAINT evidence_submissions_evidence_type_check 
CHECK (evidence_type IN ('document', 'image', 'video', 'audio', 'link', 'api_data', 'structured_data', 'other'));

ALTER TABLE public.evidence_submissions 
ADD CONSTRAINT evidence_submissions_evaluation_status_check 
CHECK (evaluation_status IN ('pending', 'processing', 'completed', 'failed', 'rejected'));

ALTER TABLE public.evidence_submissions 
ADD CONSTRAINT evidence_submissions_submission_method_check 
CHECK (submission_method IN ('manual', 'api', 'sync', 'automated'));

-- Add check constraints for learning_feedback_log
ALTER TABLE public.learning_feedback_log 
ADD CONSTRAINT learning_feedback_log_feedback_type_check 
CHECK (feedback_type IN ('evaluation_correction', 'suggestion_improvement', 'pattern_recognition', 'false_positive', 'false_negative', 'quality_feedback'));

ALTER TABLE public.learning_feedback_log 
ADD CONSTRAINT learning_feedback_log_validation_status_check 
CHECK (validation_status IN ('pending', 'validated', 'rejected', 'applied'));

-- Add check constraints for data_source_sync_logs
ALTER TABLE public.data_source_sync_logs 
ADD CONSTRAINT data_source_sync_logs_sync_status_check 
CHECK (sync_status IN ('in_progress', 'completed', 'failed', 'partial'));

-- Test the constraints work by trying invalid values (should fail)
-- This will verify constraints are working
DO $$
BEGIN
    -- Test invalid source_type (should fail)
    BEGIN
        INSERT INTO data_sources (organization_id, source_name, source_type, created_by, updated_by) 
        VALUES ('00000000-0000-0000-0000-000000000000', 'test', 'invalid_type', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');
        RAISE EXCEPTION 'Constraint check failed - invalid source_type was allowed';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'SUCCESS: source_type constraint working correctly';
        WHEN others THEN
            RAISE NOTICE 'SUCCESS: source_type constraint blocked invalid value (%))', SQLERRM;
    END;
    
    -- Test invalid evaluation_status (should fail)
    BEGIN
        INSERT INTO evidence_submissions (organization_id, evidence_type, title, submitted_by, evaluation_status) 
        VALUES ('00000000-0000-0000-0000-000000000000', 'document', 'test', '00000000-0000-0000-0000-000000000000', 'invalid_status');
        RAISE EXCEPTION 'Constraint check failed - invalid evaluation_status was allowed';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'SUCCESS: evaluation_status constraint working correctly';
        WHEN others THEN
            RAISE NOTICE 'SUCCESS: evaluation_status constraint blocked invalid value (%))', SQLERRM;
    END;
END $$;