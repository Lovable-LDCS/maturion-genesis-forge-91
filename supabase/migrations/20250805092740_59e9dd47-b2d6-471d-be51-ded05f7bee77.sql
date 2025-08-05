-- Phase 4: Human Oversight & AI Retraining Layer Schema

-- AI Feedback Submissions Table
CREATE TABLE public.ai_feedback_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  document_id UUID REFERENCES public.ai_documents(id),
  criteria_id UUID REFERENCES public.criteria(id),
  ai_generated_content TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('approved', 'needs_correction', 'rejected')),
  feedback_category TEXT CHECK (feedback_category IN ('accuracy', 'grammar', 'hallucination', 'relevance', 'completeness', 'clarity', 'other')),
  user_comments TEXT,
  revision_instructions TEXT,
  human_override_content TEXT,
  justification TEXT,
  confidence_rating INTEGER CHECK (confidence_rating >= 1 AND confidence_rating <= 5),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Feedback Retraining Weights Table
CREATE TABLE public.feedback_retraining_weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  feedback_type TEXT NOT NULL,
  feedback_category TEXT NOT NULL,
  weight_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  applies_to_content_types TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, feedback_type, feedback_category)
);

-- Human Approval Workflows Table
CREATE TABLE public.human_approval_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('criteria', 'evidence', 'intent', 'mps')),
  entity_id UUID NOT NULL,
  workflow_status TEXT NOT NULL DEFAULT 'pending_primary_review' CHECK (workflow_status IN ('pending_primary_review', 'pending_secondary_review', 'approved', 'rejected', 'escalated', 'superuser_override')),
  primary_reviewer_id UUID,
  secondary_reviewer_id UUID,
  superuser_override_by UUID,
  primary_review_decision TEXT CHECK (primary_review_decision IN ('approved', 'rejected', 'escalated')),
  secondary_review_decision TEXT CHECK (secondary_review_decision IN ('approved', 'rejected', 'escalated')),
  primary_review_comments TEXT,
  secondary_review_comments TEXT,
  superuser_override_reason TEXT,
  requires_dual_signoff BOOLEAN NOT NULL DEFAULT false,
  escalation_reason TEXT,
  final_approved_content TEXT,
  rejected_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  primary_reviewed_at TIMESTAMP WITH TIME ZONE,
  secondary_reviewed_at TIMESTAMP WITH TIME ZONE,
  final_decision_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.ai_feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_retraining_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_approval_workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_feedback_submissions
CREATE POLICY "Users can access their organization's feedback submissions" 
ON public.ai_feedback_submissions 
FOR ALL 
USING (user_can_view_organization(organization_id));

-- RLS Policies for feedback_retraining_weights  
CREATE POLICY "Admins can manage retraining weights" 
ON public.feedback_retraining_weights 
FOR ALL 
USING (organization_id IN (
  SELECT om.organization_id 
  FROM organization_members om 
  WHERE om.user_id = auth.uid() 
    AND om.role IN ('admin', 'owner')
));

-- RLS Policies for human_approval_workflows
CREATE POLICY "Users can access their organization's approval workflows" 
ON public.human_approval_workflows 
FOR ALL 
USING (user_can_view_organization(organization_id));

-- Indexes for performance
CREATE INDEX idx_ai_feedback_submissions_org_id ON public.ai_feedback_submissions(organization_id);
CREATE INDEX idx_ai_feedback_submissions_user_id ON public.ai_feedback_submissions(user_id);
CREATE INDEX idx_ai_feedback_submissions_document_id ON public.ai_feedback_submissions(document_id);
CREATE INDEX idx_ai_feedback_submissions_criteria_id ON public.ai_feedback_submissions(criteria_id);
CREATE INDEX idx_ai_feedback_submissions_feedback_type ON public.ai_feedback_submissions(feedback_type);
CREATE INDEX idx_ai_feedback_submissions_created_at ON public.ai_feedback_submissions(created_at);

CREATE INDEX idx_feedback_retraining_weights_org_id ON public.feedback_retraining_weights(organization_id);
CREATE INDEX idx_feedback_retraining_weights_type_category ON public.feedback_retraining_weights(feedback_type, feedback_category);

CREATE INDEX idx_human_approval_workflows_org_id ON public.human_approval_workflows(organization_id);
CREATE INDEX idx_human_approval_workflows_entity ON public.human_approval_workflows(entity_type, entity_id);
CREATE INDEX idx_human_approval_workflows_status ON public.human_approval_workflows(workflow_status);
CREATE INDEX idx_human_approval_workflows_primary_reviewer ON public.human_approval_workflows(primary_reviewer_id);
CREATE INDEX idx_human_approval_workflows_secondary_reviewer ON public.human_approval_workflows(secondary_reviewer_id);

-- Audit trail triggers
CREATE TRIGGER audit_ai_feedback_submissions
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_feedback_submissions
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_feedback_retraining_weights
  AFTER INSERT OR UPDATE OR DELETE ON public.feedback_retraining_weights
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_human_approval_workflows
  AFTER INSERT OR UPDATE OR DELETE ON public.human_approval_workflows
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- Insert default feedback weight configurations
INSERT INTO public.feedback_retraining_weights (organization_id, feedback_type, feedback_category, weight_multiplier, is_critical, created_by, updated_by) VALUES
  ('00000000-0000-0000-0000-000000000000', 'rejected', 'accuracy', 3.00, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000000', 'rejected', 'hallucination', 5.00, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000000', 'rejected', 'relevance', 2.50, true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000000', 'needs_correction', 'grammar', 1.00, false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000000', 'needs_correction', 'clarity', 1.50, false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000000', 'approved', 'accuracy', 0.50, false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (organization_id, feedback_type, feedback_category) DO NOTHING;