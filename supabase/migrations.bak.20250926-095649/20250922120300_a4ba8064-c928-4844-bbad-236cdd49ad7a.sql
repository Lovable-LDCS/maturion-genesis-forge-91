-- Bulk update all documents to global context with audit logging
-- First, create audit entries for the changes
INSERT INTO audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  field_name,
  old_value,
  new_value,
  changed_by,
  change_reason
)
SELECT 
  organization_id,
  'ai_documents',
  id,
  'UPDATE',
  'context_level',
  context_level,
  'global',
  '00000000-0000-0000-0000-000000000001'::uuid, -- System user for bulk operation
  'Change organisation - Bulk update for QA testing'
FROM ai_documents 
WHERE context_level != 'global' 
  AND deleted_at IS NULL;

-- Now update all documents to global context
UPDATE ai_documents 
SET 
  context_level = 'global',
  updated_at = now(),
  updated_by = '00000000-0000-0000-0000-000000000001'::uuid
WHERE context_level != 'global' 
  AND deleted_at IS NULL;