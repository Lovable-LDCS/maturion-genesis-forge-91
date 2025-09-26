-- Create QA test log table for automated testing
CREATE TABLE public.qa_test_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamp with time zone DEFAULT now(),
  mps_number int NOT NULL,
  mps_title text NOT NULL,
  test_type text NOT NULL, -- 'criteria_generation' or 'regression'
  result text NOT NULL, -- 'passed', 'failed', 'error'
  criteria_generated int DEFAULT 0,
  drift_detected boolean DEFAULT false,
  notes text,
  organization_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qa_test_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their organization's QA test logs"
ON public.qa_test_log
FOR SELECT
USING (user_can_view_organization(organization_id));

CREATE POLICY "System can insert QA test logs"
ON public.qa_test_log
FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_qa_test_log_org_run_at ON public.qa_test_log(organization_id, run_at DESC);
CREATE INDEX idx_qa_test_log_mps_test_type ON public.qa_test_log(mps_number, test_type, run_at DESC);