-- Add status index for performance optimization
CREATE INDEX IF NOT EXISTS idx_migration_status ON public.migration_status(status);

-- Add policy_log_id for future linking to policy_change_log
ALTER TABLE public.migration_status 
ADD COLUMN IF NOT EXISTS policy_log_id UUID REFERENCES public.policy_change_log(id);

-- Update the migration record with enhanced notes
UPDATE public.migration_status 
SET notes = 'Migration completed successfully. Code refactored across entire codebase: edge functions updated, QA components created, regression tests added. All references to criteria_chunks removed from criteria generators, document processors, and QA dashboards. Full traceability maintained in audit trails.'
WHERE migration_name = 'criteria_chunks_to_ai_document_chunks';