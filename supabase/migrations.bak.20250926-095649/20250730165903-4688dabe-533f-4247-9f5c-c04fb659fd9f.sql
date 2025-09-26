-- Add migration status tracking table
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
INSERT INTO public.migration_status (migration_name, status, completed_at, notes) 
VALUES ('criteria_chunks_to_ai_document_chunks', 'completed', now(), 'All code updated to use ai_document_chunks instead of criteria_chunks. The criteria_chunks table no longer exists in the database.')
ON CONFLICT (migration_name) DO UPDATE SET
  status = 'completed',
  completed_at = now(),
  notes = 'All code updated to use ai_document_chunks instead of criteria_chunks. The criteria_chunks table no longer exists in the database.';