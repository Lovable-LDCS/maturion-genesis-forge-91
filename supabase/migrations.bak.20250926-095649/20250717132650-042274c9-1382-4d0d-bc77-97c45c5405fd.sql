-- Assessment Framework Phase 1A - Database Enhancement
-- Add missing AI integration fields to complete the framework

-- Add AI evaluation fields to assessments table
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS ai_evaluation_result JSONB,
ADD COLUMN IF NOT EXISTS ai_feedback_summary TEXT,
ADD COLUMN IF NOT EXISTS user_acceptance_status TEXT CHECK (user_acceptance_status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC(5,2) CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100);

-- Add enhanced audit triggers for assessment tables to log status transitions
CREATE OR REPLACE FUNCTION public.log_assessment_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert audit record for UPDATE operations on assessment-related tables
  IF TG_OP = 'UPDATE' THEN
    -- Log each changed field with specific focus on status changes
    INSERT INTO public.audit_trail (
      organization_id, table_name, record_id, action, field_name, 
      old_value, new_value, changed_by, change_reason
    )
    SELECT 
      COALESCE(NEW.organization_id, OLD.organization_id),
      TG_TABLE_NAME,
      NEW.id,
      CASE 
        WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'status_change'
        ELSE TG_OP
      END,
      key,
      OLD.* ->> key,
      NEW.* ->> key,
      COALESCE(NEW.updated_by, auth.uid()),
      CASE 
        WHEN NEW.status IS DISTINCT FROM OLD.status THEN 
          CONCAT('Status changed from ', OLD.status, ' to ', NEW.status)
        ELSE 'Field updated'
      END
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
      COALESCE(NEW.created_by, auth.uid()),
      CONCAT(TG_TABLE_NAME, ' created')
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply enhanced audit triggers to assessment-related tables
DROP TRIGGER IF EXISTS assessment_audit_trigger ON public.assessments;
CREATE TRIGGER assessment_audit_trigger
  AFTER INSERT OR UPDATE ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_assessment_audit_trail();

DROP TRIGGER IF EXISTS assessment_scores_audit_trigger ON public.assessment_scores;
CREATE TRIGGER assessment_scores_audit_trigger
  AFTER INSERT OR UPDATE ON public.assessment_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.log_assessment_audit_trail();

DROP TRIGGER IF EXISTS evidence_audit_trigger ON public.evidence;
CREATE TRIGGER evidence_audit_trigger
  AFTER INSERT OR UPDATE ON public.evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.log_assessment_audit_trail();

DROP TRIGGER IF EXISTS criteria_audit_trigger ON public.criteria;
CREATE TRIGGER criteria_audit_trigger
  AFTER INSERT OR UPDATE ON public.criteria
  FOR EACH ROW
  EXECUTE FUNCTION public.log_assessment_audit_trail();

-- Create indexes for better performance on assessment queries
CREATE INDEX IF NOT EXISTS idx_assessments_organization_status ON public.assessments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_assessment_status ON public.assessment_scores(assessment_id, status);
CREATE INDEX IF NOT EXISTS idx_evidence_assessment_type ON public.evidence(assessment_id, evidence_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_organization_table ON public.audit_trail(organization_id, table_name, changed_at);

-- Create a function to calculate assessment completion
CREATE OR REPLACE FUNCTION public.calculate_assessment_progress(assessment_uuid UUID)
RETURNS TABLE(
  total_criteria INTEGER,
  completed_criteria INTEGER,
  completion_percentage NUMERIC(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_criteria,
    COUNT(CASE WHEN ase.status = 'approved_locked' THEN 1 END)::INTEGER as completed_criteria,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(CASE WHEN ase.status = 'approved_locked' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC(5,2)
    END as completion_percentage
  FROM public.assessment_scores ase
  WHERE ase.assessment_id = assessment_uuid;
END;
$$ LANGUAGE plpgsql;