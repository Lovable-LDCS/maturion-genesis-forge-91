-- Phase 1A: Assessment Framework Database Enhancement

-- Create status lifecycle enum
CREATE TYPE public.assessment_status AS ENUM (
  'not_started',
  'in_progress', 
  'ai_evaluated',
  'submitted_for_approval',
  'approved_locked',
  'rejected',
  'escalated',
  'alternative_proposal'
);

-- Create approval decision enum
CREATE TYPE public.approval_decision AS ENUM (
  'pending',
  'approved',
  'rejected',
  'escalated'
);

-- Create evidence type enum
CREATE TYPE public.evidence_type AS ENUM (
  'document',
  'photo',
  'log',
  'comment'
);

-- Create maturity level enum
CREATE TYPE public.maturity_level AS ENUM (
  'basic',
  'reactive', 
  'compliant',
  'proactive',
  'resilient'
);

-- Create domains table
CREATE TABLE public.domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  intent_statement TEXT,
  ai_suggested_intent TEXT,
  intent_approved_by UUID,
  intent_approved_at TIMESTAMP WITH TIME ZONE,
  display_order INTEGER NOT NULL DEFAULT 0,
  status assessment_status NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL
);

-- Create maturity practice statements table
CREATE TABLE public.maturity_practice_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  mps_number INTEGER NOT NULL, -- Global numbering 1-25
  name TEXT NOT NULL,
  summary TEXT,
  intent_statement TEXT,
  ai_suggested_intent TEXT,
  intent_approved_by UUID,
  intent_approved_at TIMESTAMP WITH TIME ZONE,
  status assessment_status NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  UNIQUE(organization_id, mps_number)
);

-- Create criteria table
CREATE TABLE public.criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mps_id UUID NOT NULL REFERENCES public.maturity_practice_statements(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  criteria_number TEXT NOT NULL, -- e.g., "1.1", "1.2", "2.1"
  statement TEXT NOT NULL,
  summary TEXT,
  ai_suggested_statement TEXT,
  ai_suggested_summary TEXT,
  statement_approved_by UUID,
  statement_approved_at TIMESTAMP WITH TIME ZONE,
  status assessment_status NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  UNIQUE(organization_id, criteria_number)
);

-- Create maturity levels table
CREATE TABLE public.maturity_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criteria_id UUID NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  level maturity_level NOT NULL,
  descriptor TEXT NOT NULL,
  ai_suggested_descriptor TEXT,
  descriptor_approved_by UUID,
  descriptor_approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  UNIQUE(criteria_id, level)
);

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  assessment_period_start DATE,
  assessment_period_end DATE,
  status assessment_status NOT NULL DEFAULT 'not_started',
  overall_completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL
);

-- Create evidence table
CREATE TABLE public.evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criteria_id UUID NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  evidence_type evidence_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  findings TEXT,
  recommendations TEXT,
  ai_suggested_findings TEXT,
  ai_suggested_recommendations TEXT,
  findings_approved_by UUID,
  findings_approved_at TIMESTAMP WITH TIME ZONE,
  compliance_score DECIMAL(5,2) DEFAULT 0.00,
  ai_compliance_score DECIMAL(5,2),
  status assessment_status NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL
);

-- Create assessment scores table
CREATE TABLE public.assessment_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  current_maturity_level maturity_level,
  target_maturity_level maturity_level,
  evidence_completeness_score DECIMAL(5,2) DEFAULT 0.00,
  overall_score DECIMAL(5,2) DEFAULT 0.00,
  ai_suggested_level maturity_level,
  ai_confidence_score DECIMAL(5,2),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  status assessment_status NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  UNIQUE(assessment_id, criteria_id)
);

-- Create approval requests table
CREATE TABLE public.approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  requester_id UUID NOT NULL,
  approver_id UUID,
  entity_type TEXT NOT NULL, -- 'domain', 'mps', 'criteria', 'evidence'
  entity_id UUID NOT NULL,
  request_type TEXT NOT NULL, -- 'content_approval', 'final_approval', 'override_approval'
  request_details JSONB,
  decision approval_decision NOT NULL DEFAULT 'pending',
  decision_reason TEXT,
  decided_by UUID,
  decided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create auditor assignments table
CREATE TABLE public.auditor_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  auditor_id UUID NOT NULL,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'assigned', -- assigned, in_progress, completed
  notes TEXT,
  site_visit_date DATE,
  completion_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, auditor_id)
);

-- Create comprehensive audit trail table
CREATE TABLE public.audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_reason TEXT,
  session_id TEXT,
  ip_address INET
);

-- Create override approvals table
CREATE TABLE public.override_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  evidence_completeness_score DECIMAL(5,2) NOT NULL,
  override_reason TEXT NOT NULL,
  approved_by UUID NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  audit_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maturity_practice_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maturity_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.override_approvals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organization-scoped access
CREATE POLICY "Users can access their organization's domains" ON public.domains
  FOR ALL USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's MPS" ON public.maturity_practice_statements
  FOR ALL USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's criteria" ON public.criteria
  FOR ALL USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's maturity levels" ON public.maturity_levels
  FOR ALL USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's assessments" ON public.assessments
  FOR ALL USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's evidence" ON public.evidence
  FOR ALL USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's assessment scores" ON public.assessment_scores
  FOR ALL USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's approval requests" ON public.approval_requests
  FOR ALL USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's auditor assignments" ON public.auditor_assignments
  FOR ALL USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's audit trail" ON public.audit_trail
  FOR ALL USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's override approvals" ON public.override_approvals
  FOR ALL USING (user_can_view_organization(organization_id));

-- Create function to log audit trail
CREATE OR REPLACE FUNCTION public.log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert audit record for UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- Log each changed field
    INSERT INTO public.audit_trail (
      organization_id, table_name, record_id, action, field_name, 
      old_value, new_value, changed_by, change_reason
    )
    SELECT 
      COALESCE(NEW.organization_id, OLD.organization_id),
      TG_TABLE_NAME,
      NEW.id,
      TG_OP,
      key,
      OLD.* ->> key,
      NEW.* ->> key,
      auth.uid(),
      'User update'
    FROM jsonb_each_text(to_jsonb(NEW)) 
    WHERE NEW.* ->> key IS DISTINCT FROM OLD.* ->> key
      AND key NOT IN ('updated_at', 'created_at');
      
    RETURN NEW;
  END IF;
  
  -- Insert audit record for INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_trail (
      organization_id, table_name, record_id, action, changed_by, change_reason
    ) VALUES (
      NEW.organization_id,
      TG_TABLE_NAME,
      NEW.id,
      TG_OP,
      auth.uid(),
      'User creation'
    );
    RETURN NEW;
  END IF;
  
  -- Insert audit record for DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_trail (
      organization_id, table_name, record_id, action, changed_by, change_reason
    ) VALUES (
      OLD.organization_id,
      TG_TABLE_NAME,
      OLD.id,
      TG_OP,
      auth.uid(),
      'User deletion'
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit trail on all assessment tables
CREATE TRIGGER audit_domains AFTER INSERT OR UPDATE OR DELETE ON public.domains
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_mps AFTER INSERT OR UPDATE OR DELETE ON public.maturity_practice_statements
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_criteria AFTER INSERT OR UPDATE OR DELETE ON public.criteria
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_maturity_levels AFTER INSERT OR UPDATE OR DELETE ON public.maturity_levels
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_assessments AFTER INSERT OR UPDATE OR DELETE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_evidence AFTER INSERT OR UPDATE OR DELETE ON public.evidence
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_assessment_scores AFTER INSERT OR UPDATE OR DELETE ON public.assessment_scores
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- Create function to auto-generate criteria numbers
CREATE OR REPLACE FUNCTION public.generate_criteria_number()
RETURNS TRIGGER AS $$
DECLARE
  mps_num INTEGER;
  next_criteria_num INTEGER;
BEGIN
  -- Get the MPS number
  SELECT mps_number INTO mps_num 
  FROM public.maturity_practice_statements 
  WHERE id = NEW.mps_id;
  
  -- Get the next criteria number for this MPS
  SELECT COALESCE(MAX(CAST(SPLIT_PART(criteria_number, '.', 2) AS INTEGER)), 0) + 1
  INTO next_criteria_num
  FROM public.criteria c
  JOIN public.maturity_practice_statements mps ON c.mps_id = mps.id
  WHERE mps.id = NEW.mps_id;
  
  -- Set the criteria number
  NEW.criteria_number := mps_num || '.' || next_criteria_num;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-numbering criteria
CREATE TRIGGER auto_number_criteria 
  BEFORE INSERT ON public.criteria
  FOR EACH ROW 
  WHEN (NEW.criteria_number IS NULL)
  EXECUTE FUNCTION public.generate_criteria_number();

-- Create function to calculate assessment completion
CREATE OR REPLACE FUNCTION public.calculate_assessment_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_criteria INTEGER;
  completed_criteria INTEGER;
  completion_pct DECIMAL(5,2);
BEGIN
  -- Count total criteria for this assessment
  SELECT COUNT(*) INTO total_criteria
  FROM public.criteria c
  JOIN public.maturity_practice_statements mps ON c.mps_id = mps.id
  JOIN public.domains d ON mps.domain_id = d.id
  WHERE d.organization_id = NEW.organization_id;
  
  -- Count completed criteria (approved status)
  SELECT COUNT(*) INTO completed_criteria
  FROM public.assessment_scores
  WHERE assessment_id = NEW.assessment_id 
    AND status = 'approved_locked';
  
  -- Calculate percentage
  IF total_criteria > 0 THEN
    completion_pct := (completed_criteria::DECIMAL / total_criteria::DECIMAL) * 100;
  ELSE
    completion_pct := 0;
  END IF;
  
  -- Update assessment completion percentage
  UPDATE public.assessments 
  SET overall_completion_percentage = completion_pct,
      updated_at = now()
  WHERE id = NEW.assessment_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for assessment completion calculation
CREATE TRIGGER update_assessment_completion
  AFTER INSERT OR UPDATE OR DELETE ON public.assessment_scores
  FOR EACH ROW EXECUTE FUNCTION public.calculate_assessment_completion();

-- Create indexes for performance
CREATE INDEX idx_domains_organization_id ON public.domains(organization_id);
CREATE INDEX idx_domains_status ON public.domains(status);
CREATE INDEX idx_mps_domain_id ON public.maturity_practice_statements(domain_id);
CREATE INDEX idx_mps_organization_id ON public.maturity_practice_statements(organization_id);
CREATE INDEX idx_mps_number ON public.maturity_practice_statements(organization_id, mps_number);
CREATE INDEX idx_criteria_mps_id ON public.criteria(mps_id);
CREATE INDEX idx_criteria_organization_id ON public.criteria(organization_id);
CREATE INDEX idx_criteria_number ON public.criteria(organization_id, criteria_number);
CREATE INDEX idx_maturity_levels_criteria_id ON public.maturity_levels(criteria_id);
CREATE INDEX idx_evidence_criteria_id ON public.evidence(criteria_id);
CREATE INDEX idx_evidence_assessment_id ON public.evidence(assessment_id);
CREATE INDEX idx_evidence_organization_id ON public.evidence(organization_id);
CREATE INDEX idx_assessment_scores_assessment_id ON public.assessment_scores(assessment_id);
CREATE INDEX idx_assessment_scores_criteria_id ON public.assessment_scores(criteria_id);
CREATE INDEX idx_audit_trail_organization_id ON public.audit_trail(organization_id);
CREATE INDEX idx_audit_trail_table_record ON public.audit_trail(table_name, record_id);
CREATE INDEX idx_audit_trail_changed_at ON public.audit_trail(changed_at);
CREATE INDEX idx_approval_requests_organization_id ON public.approval_requests(organization_id);
CREATE INDEX idx_approval_requests_entity ON public.approval_requests(entity_type, entity_id);
CREATE INDEX idx_auditor_assignments_organization_id ON public.auditor_assignments(organization_id);
CREATE INDEX idx_auditor_assignments_assessment_id ON public.auditor_assignments(assessment_id);