-- Update the data_sources check constraint to allow more source types
ALTER TABLE data_sources DROP CONSTRAINT IF EXISTS data_sources_source_type_check;

-- Add updated constraint with more source types
ALTER TABLE data_sources ADD CONSTRAINT data_sources_source_type_check 
CHECK (source_type IN ('supabase', 'postgresql', 'mysql', 'rest_api', 'google_drive', 'sharepoint', 'api', 'custom'));