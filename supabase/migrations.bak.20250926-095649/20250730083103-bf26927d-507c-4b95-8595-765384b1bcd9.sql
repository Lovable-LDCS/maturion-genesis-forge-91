-- Add run_type field to track manual vs scheduled QA runs
ALTER TABLE public.qa_test_log 
ADD COLUMN run_type text DEFAULT 'scheduled';

-- Add triggered_by field to track who triggered manual runs
ALTER TABLE public.qa_test_log 
ADD COLUMN triggered_by uuid;

-- Add index for performance
CREATE INDEX idx_qa_test_log_run_type ON public.qa_test_log(run_type, run_at DESC);