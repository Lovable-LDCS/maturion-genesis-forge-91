-- Enhanced security configuration migration
-- This migration adds additional security tables and configurations

-- Create security configuration table for system-wide security settings
CREATE TABLE public.security_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_name text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on security configuration
ALTER TABLE public.security_configuration ENABLE ROW LEVEL SECURITY;

-- Only admin users can manage security configuration
CREATE POLICY "Admin users can manage security configuration"
ON public.security_configuration
FOR ALL
TO authenticated
USING (user_has_role(auth.uid(), 'admin'))
WITH CHECK (user_has_role(auth.uid(), 'admin'));

-- Create security monitoring table for tracking security metrics
CREATE TABLE public.security_monitoring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id)
);

-- Enable RLS on security monitoring
ALTER TABLE public.security_monitoring ENABLE ROW LEVEL SECURITY;

-- Users can view their organization's security monitoring data
CREATE POLICY "Users can view their organization's security monitoring"
ON public.security_monitoring
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM public.organization_members om 
    WHERE om.user_id = auth.uid()
  )
);

-- Only admin users can insert security monitoring data
CREATE POLICY "Admin users can insert security monitoring data"
ON public.security_monitoring
FOR INSERT
TO authenticated
WITH CHECK (user_has_role(auth.uid(), 'admin'));

-- Insert default security configuration settings
INSERT INTO public.security_configuration (setting_name, setting_value, description) VALUES
('rate_limit_window_seconds', '60', 'Rate limiting window duration in seconds'),
('max_login_attempts', '5', 'Maximum failed login attempts before lockout'),
('session_timeout_hours', '24', 'Session timeout duration in hours'),
('password_min_length', '8', 'Minimum password length requirement'),
('require_mfa', 'false', 'Whether multi-factor authentication is required'),
('audit_retention_days', '365', 'Number of days to retain audit trail data');

-- Create function to log security metrics
CREATE OR REPLACE FUNCTION public.log_security_metric(
  metric_type_param text,
  metric_value_param numeric,
  metadata_param jsonb DEFAULT '{}',
  organization_id_param uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.security_monitoring (
    metric_type,
    metric_value,
    metadata,
    organization_id
  ) VALUES (
    metric_type_param,
    metric_value_param,
    metadata_param,
    organization_id_param
  );
END;
$$;

-- Create function to get security configuration
CREATE OR REPLACE FUNCTION public.get_security_setting(setting_name_param text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT setting_value INTO result
  FROM public.security_configuration
  WHERE setting_name = setting_name_param;
  
  RETURN COALESCE(result, 'null'::jsonb);
END;
$$;

-- Create trigger to update security configuration timestamp
CREATE TRIGGER update_security_configuration_updated_at
  BEFORE UPDATE ON public.security_configuration
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit trail trigger to security configuration
CREATE TRIGGER log_security_configuration_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.security_configuration
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_trail();

-- Create indexes for performance
CREATE INDEX idx_security_monitoring_metric_type ON public.security_monitoring(metric_type);
CREATE INDEX idx_security_monitoring_recorded_at ON public.security_monitoring(recorded_at);
CREATE INDEX idx_security_monitoring_organization_id ON public.security_monitoring(organization_id);
CREATE INDEX idx_security_configuration_setting_name ON public.security_configuration(setting_name);

-- Insert initial security metrics
SELECT public.log_security_metric('system_initialization', 1, '{"message": "Security monitoring system initialized"}');

COMMENT ON TABLE public.security_configuration IS 'System-wide security configuration settings';
COMMENT ON TABLE public.security_monitoring IS 'Security metrics and monitoring data';
COMMENT ON FUNCTION public.log_security_metric IS 'Function to log security metrics for monitoring';
COMMENT ON FUNCTION public.get_security_setting IS 'Function to retrieve security configuration settings';