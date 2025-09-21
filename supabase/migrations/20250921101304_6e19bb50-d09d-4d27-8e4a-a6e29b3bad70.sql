-- Fix Maturion Supabase data source URL and add sync progress column
-- Update the invalid Maturion Supabase URL to the correct one
UPDATE data_sources 
SET connection_config = jsonb_set(
  connection_config, 
  '{url}', 
  '"https://dmhlxhatogrrrvuruayv.supabase.co"'
)
WHERE source_name = 'Maturion Supabase' 
  AND connection_config->>'url' = 'https://supabase.com/dashboard/project/dmhlxhatogrrrvuruayv';

-- Add sync_progress_message column to data_source_sync_logs for better user feedback
ALTER TABLE data_source_sync_logs 
ADD COLUMN IF NOT EXISTS sync_progress_message text;

-- Reset sync status for Maturion Supabase to allow fresh sync attempts (using valid status)
UPDATE data_sources 
SET sync_status = 'never_synced',
    sync_error_message = NULL,
    last_sync_at = NULL
WHERE source_name = 'Maturion Supabase';