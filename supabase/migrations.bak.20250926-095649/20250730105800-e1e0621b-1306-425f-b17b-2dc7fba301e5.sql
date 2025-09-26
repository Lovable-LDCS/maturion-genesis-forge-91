-- Add acknowledgement fields to refactor_qa_log table
ALTER TABLE public.refactor_qa_log
ADD COLUMN acknowledged BOOLEAN DEFAULT false,
ADD COLUMN review_notes TEXT,
ADD COLUMN acknowledged_by UUID,
ADD COLUMN acknowledged_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance on acknowledged status
CREATE INDEX idx_refactor_qa_log_acknowledged ON public.refactor_qa_log(acknowledged, run_at DESC);