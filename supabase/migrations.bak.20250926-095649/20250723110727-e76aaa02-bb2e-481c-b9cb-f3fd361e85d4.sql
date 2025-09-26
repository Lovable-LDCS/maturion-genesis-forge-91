-- Create criteria deferrals table for smart MPS allocation
CREATE TABLE public.criteria_deferrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposed_criteria_id UUID NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  suggested_domain TEXT NOT NULL,
  suggested_mps_number INTEGER NOT NULL,
  suggested_mps_title TEXT,
  reason TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  deferred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  original_mps_id UUID REFERENCES public.maturity_practice_statements(id)
);

-- Enable RLS on deferrals table
ALTER TABLE public.criteria_deferrals ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for criteria deferrals
CREATE POLICY "Users can access their organization's deferrals"
ON public.criteria_deferrals
FOR ALL
USING (user_can_view_organization(organization_id));

-- Create indexes for better performance
CREATE INDEX idx_criteria_deferrals_organization_id ON public.criteria_deferrals(organization_id);
CREATE INDEX idx_criteria_deferrals_proposed_criteria_id ON public.criteria_deferrals(proposed_criteria_id);
CREATE INDEX idx_criteria_deferrals_suggested_domain ON public.criteria_deferrals(suggested_domain);
CREATE INDEX idx_criteria_deferrals_suggested_mps ON public.criteria_deferrals(suggested_mps_number);

-- Add status field to criteria table to track deferred criteria
ALTER TABLE public.criteria ADD COLUMN IF NOT EXISTS deferral_status TEXT DEFAULT NULL;

-- Update criteria status enum to include 'deferred'
-- Note: We'll handle this as a text field for flexibility