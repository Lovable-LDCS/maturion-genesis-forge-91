-- Reset stuck sync statuses for existing data sources
UPDATE data_sources 
SET sync_status = 'never_synced', 
    sync_error_message = null,
    updated_at = now()
WHERE sync_status = 'syncing' 
  AND updated_at < now() - interval '1 hour';