-- Mark criteria_chunks table as deprecated
-- Add deprecation warning comment to the table
COMMENT ON TABLE public.criteria_chunks IS 'DEPRECATED: This table has been replaced by ai_document_chunks. Use ai_document_chunks for all new development. This table is preserved for fallback/debug purposes only.';

-- Add migration status tracking
CREATE TABLE IF NOT EXISTS public.migration_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Track this migration
INSERT INTO public.migration_status (migration_name, status, notes) 
VALUES ('criteria_chunks_to_ai_document_chunks', 'completed', 'All code updated to use ai_document_chunks instead of criteria_chunks')
ON CONFLICT (migration_name) DO UPDATE SET
  status = 'completed',
  completed_at = now(),
  notes = 'All code updated to use ai_document_chunks instead of criteria_chunks';