-- Table to store refactor analysis results
CREATE TABLE public.refactor_qa_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamp with time zone DEFAULT now(),
  source_file text NOT NULL,
  finding_type text NOT NULL, -- 'unused-function', 'dead-component', 'stale-api', etc.
  severity text NOT NULL,     -- 'low', 'medium', 'high'
  description text,
  recommended_action text,
  detected_by text DEFAULT 'refactor-scanner-v1',
  organization_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refactor_qa_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can access their organization's refactor logs"
  ON public.refactor_qa_log
  FOR ALL
  USING (user_can_view_organization(organization_id));

-- Index for performance
CREATE INDEX idx_refactor_qa_log_org_run_at ON public.refactor_qa_log(organization_id, run_at DESC);
CREATE INDEX idx_refactor_qa_log_severity ON public.refactor_qa_log(severity, run_at DESC);