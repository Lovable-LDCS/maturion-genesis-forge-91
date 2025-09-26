-- Create ai_feedback_log table for learning feedback
CREATE TABLE public.ai_feedback_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  domain_id UUID NULL,
  user_id UUID NOT NULL,
  rejected_text TEXT NOT NULL,
  replacement_text TEXT NULL,
  reason TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('rejection', 'modification', 'sector_misalignment')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_feedback_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can access their organization's feedback log" 
ON public.ai_feedback_log 
FOR ALL 
USING (user_can_view_organization(organization_id));

-- Create indexes for better performance
CREATE INDEX idx_ai_feedback_log_org_id ON public.ai_feedback_log(organization_id);
CREATE INDEX idx_ai_feedback_log_user_id ON public.ai_feedback_log(user_id);
CREATE INDEX idx_ai_feedback_log_feedback_type ON public.ai_feedback_log(feedback_type);
CREATE INDEX idx_ai_feedback_log_created_at ON public.ai_feedback_log(created_at DESC);