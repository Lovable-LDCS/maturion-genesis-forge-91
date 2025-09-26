-- Fix pending organization uploads and update processing status
-- This migration addresses documents stuck in pending status

-- Update stuck organization profile documents to queued status for reprocessing
UPDATE public.ai_documents 
SET processing_status = 'pending',
    updated_at = now(),
    metadata = COALESCE(metadata, '{}')::jsonb || '{"reprocessing_trigger": "migration_fix", "migration_timestamp": "' || now()::text || '"}'::jsonb
WHERE processing_status IN ('pending', 'processing')
  AND (file_name ILIKE '%organization%profile%' 
       OR file_name ILIKE '%organization_profile%'
       OR document_type = 'organization-profile'
       OR file_name ILIKE '%.md'
       OR file_name ILIKE '%.txt')
  AND created_at < (now() - INTERVAL '10 minutes');

-- Add content-type normalization for organization documents
UPDATE public.ai_documents 
SET mime_type = CASE 
  WHEN file_name ILIKE '%.md' THEN 'text/markdown'
  WHEN file_name ILIKE '%.txt' THEN 'text/plain'
  WHEN mime_type = '' OR mime_type IS NULL THEN 'text/plain'
  ELSE mime_type
END,
updated_at = now()
WHERE (mime_type = '' OR mime_type IS NULL OR mime_type = 'application/octet-stream')
  AND (file_name ILIKE '%.md' OR file_name ILIKE '%.txt' OR file_name ILIKE '%organization%');

-- Create organization-profile document type for better categorization
UPDATE public.ai_documents 
SET document_type = 'organization-profile',
    updated_at = now()
WHERE (file_name ILIKE '%organization%profile%' 
       OR file_name ILIKE '%organization_profile%')
  AND document_type != 'organization-profile';

-- Log migration for audit trail
INSERT INTO public.audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  changed_by,
  change_reason,
  field_name,
  old_value,
  new_value
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'ai_documents',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'MIGRATION_FIX_PENDING_UPLOADS',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Fixed pending organization document uploads - normalized mime types and reset stuck processing statuses',
  'processing_status,mime_type,document_type',
  'pending/processing',
  'queued_for_reprocessing'
);