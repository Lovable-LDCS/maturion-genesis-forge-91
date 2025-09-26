-- Phase 3: Resilient AI Intelligence & Watchdog Logic Database Schema

-- AI Behavior Monitoring Table
CREATE TABLE public.ai_behavior_monitoring (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  document_id UUID REFERENCES public.ai_documents(id),
  criteria_id UUID REFERENCES public.criteria(id),
  behavior_type TEXT NOT NULL, -- 'hallucination', 'placeholder', 'format_deviation', 'logic_gap', 'memory_loss'
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  detected_content TEXT NOT NULL,
  expected_pattern TEXT,
  severity_level TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  auto_flagged BOOLEAN NOT NULL DEFAULT true,
  reviewed_by UUID,
  review_status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'false_positive', 'resolved'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- System Drift Detection Table
CREATE TABLE public.system_drift_detection (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  drift_type TEXT NOT NULL, -- 'performance', 'accuracy', 'consistency', 'response_time'
  baseline_value NUMERIC(10,4) NOT NULL,
  current_value NUMERIC(10,4) NOT NULL,
  drift_percentage NUMERIC(5,2) NOT NULL,
  threshold_exceeded BOOLEAN NOT NULL DEFAULT false,
  alert_triggered BOOLEAN NOT NULL DEFAULT false,
  recovery_action_suggested TEXT,
  recovery_status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  metadata JSONB DEFAULT '{}',
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Cross-Organization Tracking Table
CREATE TABLE public.cross_org_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_organization_id UUID NOT NULL,
  target_organization_id UUID,
  tracking_type TEXT NOT NULL, -- 'duplicate_upload', 'similar_content', 'cross_reference'
  content_hash TEXT NOT NULL,
  similarity_score NUMERIC(5,2),
  flagged_for_review BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID,
  review_status TEXT DEFAULT 'pending',
  action_taken TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Watchdog Incidents Table
CREATE TABLE public.watchdog_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  incident_type TEXT NOT NULL, -- 'security_breach', 'data_corruption', 'ai_malfunction', 'system_failure'
  severity_level TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_entities JSONB DEFAULT '{}', -- list of affected documents, users, etc.
  detection_method TEXT NOT NULL, -- 'automated', 'user_report', 'manual_review'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'closed'
  assigned_to UUID,
  escalation_level INTEGER DEFAULT 1,
  resolution_notes TEXT,
  audit_trail JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- AI Confidence Scoring Table
CREATE TABLE public.ai_confidence_scoring (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  document_id UUID REFERENCES public.ai_documents(id),
  criteria_id UUID REFERENCES public.criteria(id),
  assessment_id UUID REFERENCES public.assessments(id),
  confidence_category TEXT NOT NULL, -- 'content_analysis', 'criteria_generation', 'evidence_evaluation'
  base_confidence NUMERIC(5,2) NOT NULL,
  adjusted_confidence NUMERIC(5,2) NOT NULL,
  confidence_factors JSONB DEFAULT '{}', -- factors affecting confidence
  quality_indicators JSONB DEFAULT '{}', -- quality metrics
  drift_detected BOOLEAN NOT NULL DEFAULT false,
  requires_human_review BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID,
  human_override_confidence NUMERIC(5,2),
  override_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Watchdog Alerts Table  
CREATE TABLE public.watchdog_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  alert_type TEXT NOT NULL, -- 'drift_detection', 'behavior_anomaly', 'security_incident', 'performance_degradation'
  severity_level TEXT NOT NULL, -- 'info', 'warning', 'error', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  actionable_guidance TEXT,
  related_incident_id UUID REFERENCES public.watchdog_incidents(id),
  auto_generated BOOLEAN NOT NULL DEFAULT true,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_channels JSONB DEFAULT '[]', -- ['slack', 'email', 'in_app']
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Feedback Loop Logging Table
CREATE TABLE public.ai_feedback_loop_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL, -- 'rejection', 'correction', 'approval', 'modification'
  original_content TEXT NOT NULL,
  modified_content TEXT,
  rejection_reason TEXT,
  correction_type TEXT, -- 'grammar', 'factual', 'format', 'tone', 'completeness'
  confidence_impact NUMERIC(5,2), -- how much this affects AI confidence
  learning_weight NUMERIC(3,2) DEFAULT 1.00, -- importance for AI learning
  applied_to_model BOOLEAN NOT NULL DEFAULT false,
  cross_org_applicable BOOLEAN NOT NULL DEFAULT false,
  pattern_extracted BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  applied_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.ai_behavior_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_drift_detection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_org_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchdog_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_confidence_scoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchdog_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback_loop_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access their organization's AI behavior monitoring"
  ON public.ai_behavior_monitoring FOR ALL
  USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's system drift detection"
  ON public.system_drift_detection FOR ALL
  USING (user_can_view_organization(organization_id));

CREATE POLICY "Admins can access cross-org tracking"
  ON public.cross_org_tracking FOR ALL
  USING (is_user_admin() OR user_can_view_organization(source_organization_id));

CREATE POLICY "Users can access their organization's watchdog incidents"
  ON public.watchdog_incidents FOR ALL
  USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's AI confidence scoring"
  ON public.ai_confidence_scoring FOR ALL
  USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's watchdog alerts"
  ON public.watchdog_alerts FOR ALL
  USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's AI feedback loop log"
  ON public.ai_feedback_loop_log FOR ALL
  USING (user_can_view_organization(organization_id));

-- Indexes for performance
CREATE INDEX idx_ai_behavior_monitoring_org_type ON public.ai_behavior_monitoring(organization_id, behavior_type);
CREATE INDEX idx_system_drift_detection_org_type ON public.system_drift_detection(organization_id, drift_type);
CREATE INDEX idx_cross_org_tracking_hash ON public.cross_org_tracking(content_hash);
CREATE INDEX idx_watchdog_incidents_org_status ON public.watchdog_incidents(organization_id, status);
CREATE INDEX idx_ai_confidence_scoring_org_category ON public.ai_confidence_scoring(organization_id, confidence_category);
CREATE INDEX idx_watchdog_alerts_org_severity ON public.watchdog_alerts(organization_id, severity_level);
CREATE INDEX idx_ai_feedback_loop_org_type ON public.ai_feedback_loop_log(organization_id, feedback_type);

-- Triggers for audit trail
CREATE TRIGGER watchdog_incidents_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.watchdog_incidents
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER ai_confidence_scoring_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_confidence_scoring
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();