-- Fix critical RLS security issues
-- Enable RLS on tables that are missing it

-- Check and enable RLS on chunks table
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for chunks table
CREATE POLICY "Organization members can access chunks"
ON public.chunks
FOR ALL
USING (
  document_id IN (
    SELECT id FROM public.ai_documents 
    WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  )
);

-- Enable RLS on ai_chunk_hash_stats if missing
ALTER TABLE public.ai_chunk_hash_stats ENABLE ROW LEVEL SECURITY;

-- Add policy for ai_chunk_hash_stats (admin only)
CREATE POLICY "Admins can access chunk hash stats"
ON public.ai_chunk_hash_stats
FOR ALL
USING (is_superuser());

-- Create regular indexes to improve performance for the new tables
CREATE INDEX IF NOT EXISTS idx_data_sources_sync_status ON public.data_sources(sync_status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_evidence_submissions_submitted_at ON public.evidence_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_learning_feedback_validation ON public.learning_feedback_log(validation_status, applied_to_model);