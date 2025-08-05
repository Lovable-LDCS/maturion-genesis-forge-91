-- Create QA Rules table for enforceable QA logic
CREATE TABLE IF NOT EXISTS public.qa_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'validation', 'threshold', 'alert', 'processing'
  rule_description TEXT,
  rule_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  severity_level TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on qa_rules
ALTER TABLE public.qa_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for qa_rules
CREATE POLICY "Users can view their organization's QA rules"
  ON public.qa_rules
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage QA rules"
  ON public.qa_rules
  FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  ));

-- Create audit trail trigger for qa_rules
CREATE TRIGGER qa_rules_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.qa_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_trail();

-- Add index for performance
CREATE INDEX idx_qa_rules_organization_active ON public.qa_rules(organization_id, is_active);
CREATE INDEX idx_qa_rules_type_severity ON public.qa_rules(rule_type, severity_level);

-- Create enhanced QA metrics tracking table for real-time monitoring
CREATE TABLE IF NOT EXISTS public.qa_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  alert_type TEXT NOT NULL, -- 'upload_failure', 'processing_time', 'validation_gap', 'rls_error'
  severity_level TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  alert_data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  slack_sent BOOLEAN NOT NULL DEFAULT false,
  slack_sent_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on qa_alerts
ALTER TABLE public.qa_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for qa_alerts
CREATE POLICY "Users can view their organization's QA alerts"
  ON public.qa_alerts
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage QA alerts"
  ON public.qa_alerts
  FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  ));

-- Add indexes for qa_alerts
CREATE INDEX idx_qa_alerts_organization_unread ON public.qa_alerts(organization_id, is_read) WHERE NOT is_read;
CREATE INDEX idx_qa_alerts_severity_unresolved ON public.qa_alerts(severity_level, is_resolved) WHERE NOT is_resolved;
CREATE INDEX idx_qa_alerts_slack_pending ON public.qa_alerts(slack_sent, created_at) WHERE NOT slack_sent;

-- Insert default QA rules for organizations with proper JSON casting
INSERT INTO public.qa_rules (organization_id, rule_name, rule_type, rule_description, rule_config, severity_level, created_by, updated_by)
SELECT 
  o.id as organization_id,
  'Upload Success Rate Threshold',
  'threshold',
  'Alert when upload success rate falls below 95%',
  '{"threshold": 95, "metric": "upload_success_rate", "timeframe": "1h"}'::jsonb,
  'warning',
  o.owner_id,
  o.owner_id
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.qa_rules qr 
  WHERE qr.organization_id = o.id AND qr.rule_name = 'Upload Success Rate Threshold'
)
UNION ALL
SELECT 
  o.id as organization_id,
  'Processing Time Alert',
  'threshold', 
  'Alert when average processing time exceeds 10 seconds',
  '{"threshold": 10, "metric": "avg_processing_time", "timeframe": "1h"}'::jsonb,
  'info',
  o.owner_id,
  o.owner_id
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.qa_rules qr 
  WHERE qr.organization_id = o.id AND qr.rule_name = 'Processing Time Alert'
)
UNION ALL
SELECT 
  o.id as organization_id,
  'RLS Error Spike Detection',
  'validation',
  'Alert when RLS errors spike above normal levels',
  '{"threshold": 5, "metric": "rls_errors", "timeframe": "5m"}'::jsonb,
  'critical',
  o.owner_id,
  o.owner_id
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.qa_rules qr 
  WHERE qr.organization_id = o.id AND qr.rule_name = 'RLS Error Spike Detection'
);