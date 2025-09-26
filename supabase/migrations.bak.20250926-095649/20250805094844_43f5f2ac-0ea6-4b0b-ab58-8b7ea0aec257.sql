-- Phase 5: Self-Learning & Pattern Recognition Schema
-- Tables for AI learning pattern recognition and adaptive retraining

-- AI Learning Patterns - Store identified patterns from feedback submissions
CREATE TABLE public.ai_learning_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  pattern_type TEXT NOT NULL, -- 'rejection_phrase', 'sector_preference', 'terminology_correction', 'evidence_type_bias'
  pattern_category TEXT NOT NULL, -- 'content_quality', 'sector_alignment', 'compliance_accuracy', 'user_preference'
  pattern_text TEXT NOT NULL,
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  frequency_count INTEGER NOT NULL DEFAULT 1,
  first_detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_feedback_ids UUID[] DEFAULT '{}',
  affected_domains TEXT[] DEFAULT '{}',
  affected_sectors TEXT[] DEFAULT '{}',
  pattern_strength TEXT NOT NULL DEFAULT 'weak', -- 'weak', 'moderate', 'strong', 'critical'
  validation_status TEXT NOT NULL DEFAULT 'unvalidated', -- 'unvalidated', 'human_approved', 'human_rejected', 'auto_validated'
  validated_by UUID,
  validated_at TIMESTAMP WITH TIME ZONE,
  suppression_rule TEXT, -- Rule for content suppression if applicable
  replacement_suggestion TEXT, -- Suggested replacement content
  learning_weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  cross_org_applicable BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL
);

-- Learning Rule Configurations - Configurable thresholds and learning rules
CREATE TABLE public.learning_rule_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'pattern_detection', 'confidence_threshold', 'auto_validation', 'suppression_trigger'
  rule_category TEXT NOT NULL, -- 'content_quality', 'sector_alignment', 'compliance_accuracy'
  rule_parameters JSONB NOT NULL DEFAULT '{}',
  threshold_values JSONB NOT NULL DEFAULT '{}', -- min_frequency, min_confidence, validation_threshold, etc.
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  applies_to_content_types TEXT[] DEFAULT '{}', -- 'criteria', 'evidence', 'mps_statement', 'intent'
  applies_to_domains TEXT[] DEFAULT '{}',
  priority_level INTEGER NOT NULL DEFAULT 5, -- 1-10, higher = more priority
  auto_activation_enabled BOOLEAN NOT NULL DEFAULT false, -- Phase 5 activation control
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  effectiveness_score NUMERIC(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  
  CONSTRAINT unique_org_rule_name UNIQUE (organization_id, rule_name)
);

-- Pattern Recognition History - Track pattern evolution over time
CREATE TABLE public.pattern_recognition_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  pattern_id UUID NOT NULL,
  analysis_type TEXT NOT NULL, -- 'detection', 'validation', 'strength_update', 'suppression_applied'
  previous_state JSONB, -- Snapshot of pattern before change
  new_state JSONB, -- Snapshot of pattern after change
  change_trigger TEXT NOT NULL, -- 'new_feedback', 'manual_validation', 'threshold_met', 'human_override'
  change_details JSONB DEFAULT '{}',
  confidence_change NUMERIC(5,2) DEFAULT 0.00,
  frequency_change INTEGER DEFAULT 0,
  triggered_by_feedback_id UUID,
  analysis_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Learning Model Snapshots - Store model states for rollback capability
CREATE TABLE public.learning_model_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  snapshot_name TEXT NOT NULL,
  snapshot_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'automated', 'milestone', 'pre_activation'
  snapshot_reason TEXT,
  pattern_count INTEGER NOT NULL DEFAULT 0,
  active_rules_count INTEGER NOT NULL DEFAULT 0,
  model_state JSONB NOT NULL DEFAULT '{}', -- Complete snapshot of learning state
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  is_baseline BOOLEAN NOT NULL DEFAULT false,
  rollback_available BOOLEAN NOT NULL DEFAULT true,
  
  CONSTRAINT unique_org_snapshot_name UNIQUE (organization_id, snapshot_name)
);

-- Adaptive Learning Metrics - Performance tracking for learning effectiveness
CREATE TABLE public.adaptive_learning_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  metric_type TEXT NOT NULL, -- 'pattern_accuracy', 'feedback_reduction', 'content_quality', 'user_satisfaction'
  metric_category TEXT NOT NULL, -- 'detection_performance', 'suppression_effectiveness', 'learning_speed'
  measurement_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  measurement_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  baseline_value NUMERIC(10,4),
  current_value NUMERIC(10,4) NOT NULL,
  improvement_percentage NUMERIC(5,2),
  measurement_context JSONB DEFAULT '{}', -- domains, feedback types measured, etc.
  data_points_count INTEGER NOT NULL DEFAULT 0,
  confidence_interval JSONB, -- statistical confidence data
  trend_direction TEXT, -- 'improving', 'declining', 'stable', 'volatile'
  significance_level NUMERIC(5,4) DEFAULT 0.05,
  measurement_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  measured_by UUID
);

-- Add foreign key references
ALTER TABLE public.ai_learning_patterns 
  ADD CONSTRAINT fk_learning_patterns_organization 
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.learning_rule_configurations 
  ADD CONSTRAINT fk_learning_rules_organization 
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.pattern_recognition_history 
  ADD CONSTRAINT fk_pattern_history_organization 
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_pattern_history_pattern 
  FOREIGN KEY (pattern_id) REFERENCES public.ai_learning_patterns(id) ON DELETE CASCADE;

ALTER TABLE public.learning_model_snapshots 
  ADD CONSTRAINT fk_model_snapshots_organization 
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.adaptive_learning_metrics 
  ADD CONSTRAINT fk_learning_metrics_organization 
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.ai_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_rule_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_recognition_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_model_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_learning_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Phase 5 tables
CREATE POLICY "Users can access their organization's learning patterns" 
  ON public.ai_learning_patterns 
  FOR ALL 
  USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's learning rules" 
  ON public.learning_rule_configurations 
  FOR ALL 
  USING (user_can_view_organization(organization_id));

CREATE POLICY "Users can access their organization's pattern history" 
  ON public.pattern_recognition_history 
  FOR ALL 
  USING (user_can_view_organization(organization_id));

CREATE POLICY "Admins can manage model snapshots" 
  ON public.learning_model_snapshots 
  FOR ALL 
  USING (organization_id IN (
    SELECT om.organization_id FROM organization_members om 
    WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'owner')
  ));

CREATE POLICY "Users can access their organization's learning metrics" 
  ON public.adaptive_learning_metrics 
  FOR ALL 
  USING (user_can_view_organization(organization_id));

-- Indexes for performance
CREATE INDEX idx_learning_patterns_org_type ON public.ai_learning_patterns(organization_id, pattern_type);
CREATE INDEX idx_learning_patterns_confidence ON public.ai_learning_patterns(confidence_score DESC);
CREATE INDEX idx_learning_patterns_frequency ON public.ai_learning_patterns(frequency_count DESC);
CREATE INDEX idx_learning_patterns_active ON public.ai_learning_patterns(is_active, validation_status);

CREATE INDEX idx_learning_rules_org_enabled ON public.learning_rule_configurations(organization_id, is_enabled);
CREATE INDEX idx_learning_rules_type_category ON public.learning_rule_configurations(rule_type, rule_category);
CREATE INDEX idx_learning_rules_priority ON public.learning_rule_configurations(priority_level DESC);

CREATE INDEX idx_pattern_history_pattern_time ON public.pattern_recognition_history(pattern_id, created_at DESC);
CREATE INDEX idx_pattern_history_org_type ON public.pattern_recognition_history(organization_id, analysis_type);

CREATE INDEX idx_model_snapshots_org_time ON public.learning_model_snapshots(organization_id, created_at DESC);
CREATE INDEX idx_model_snapshots_baseline ON public.learning_model_snapshots(organization_id, is_baseline);

CREATE INDEX idx_learning_metrics_org_period ON public.adaptive_learning_metrics(organization_id, measurement_period_start, measurement_period_end);
CREATE INDEX idx_learning_metrics_type_category ON public.adaptive_learning_metrics(metric_type, metric_category);

-- Audit trail triggers for learning tables
CREATE TRIGGER log_learning_patterns_audit 
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_learning_patterns 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER log_learning_rules_audit 
  AFTER INSERT OR UPDATE OR DELETE ON public.learning_rule_configurations 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER log_model_snapshots_audit 
  AFTER INSERT OR UPDATE OR DELETE ON public.learning_model_snapshots 
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();