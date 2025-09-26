-- Create subscription modules table
CREATE TABLE public.subscription_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  monthly_price DECIMAL(10,2) NOT NULL,
  yearly_discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  bundle_discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.subscription_modules ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "Admin users can manage subscription modules" 
ON public.subscription_modules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND email IN ('johan.ras@apginc.ca', 'jorrie.jordaan@apginc.ca')
  )
);

-- Create discount codes table
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL(10,2) NOT NULL,
  applicable_modules UUID[] DEFAULT '{}',
  expiry_date TIMESTAMP WITH TIME ZONE,
  usage_limit INTEGER,
  current_usage INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'active', 'expired', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "Admin users can manage discount codes" 
ON public.discount_codes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND email IN ('johan.ras@apginc.ca', 'jorrie.jordaan@apginc.ca')
  )
);

-- Create approval requests table
CREATE TABLE public.admin_approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT NOT NULL CHECK (request_type IN ('price_change', 'discount_code', 'module_activation')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  requested_changes JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  requested_by UUID NOT NULL,
  approved_by UUID,
  rejection_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_approval_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "Admin users can manage approval requests" 
ON public.admin_approval_requests 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND email IN ('johan.ras@apginc.ca', 'jorrie.jordaan@apginc.ca')
  )
);

-- Create admin activity log table
CREATE TABLE public.admin_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "Admin users can view activity log" 
ON public.admin_activity_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND email IN ('johan.ras@apginc.ca', 'jorrie.jordaan@apginc.ca')
  )
);

-- Insert default subscription modules
INSERT INTO public.subscription_modules (name, slug, monthly_price, yearly_discount_percentage, bundle_discount_percentage, created_by, updated_by) VALUES
('Maturion Core Platform', 'core-platform', 500.00, 10.00, 10.00, '1dfc1c68-022a-4b49-a86e-272a83bff8d3', '1dfc1c68-022a-4b49-a86e-272a83bff8d3'),
('Risk Management Framework', 'risk-management', 200.00, 10.00, 10.00, '1dfc1c68-022a-4b49-a86e-272a83bff8d3', '1dfc1c68-022a-4b49-a86e-272a83bff8d3'),
('Action Management System', 'action-management', 50.00, 10.00, 10.00, '1dfc1c68-022a-4b49-a86e-272a83bff8d3', '1dfc1c68-022a-4b49-a86e-272a83bff8d3'),
('Analytics & Surveillance Integration', 'analytics-surveillance', 500.00, 10.00, 10.00, '1dfc1c68-022a-4b49-a86e-272a83bff8d3', '1dfc1c68-022a-4b49-a86e-272a83bff8d3');

-- Create function to log admin activities
CREATE OR REPLACE FUNCTION public.log_admin_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_activity_log (
    admin_user_id,
    action_type,
    entity_type,
    entity_id,
    details
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for admin activity logging
CREATE TRIGGER log_subscription_modules_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.subscription_modules
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity();

CREATE TRIGGER log_discount_codes_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity();

CREATE TRIGGER log_approval_requests_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity();

-- Create function to auto-expire approval requests
CREATE OR REPLACE FUNCTION public.expire_approval_requests()
RETURNS void AS $$
BEGIN
  UPDATE public.admin_approval_requests 
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create update triggers for timestamps
CREATE TRIGGER update_subscription_modules_timestamp
  BEFORE UPDATE ON public.subscription_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discount_codes_timestamp
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_approval_requests_timestamp
  BEFORE UPDATE ON public.admin_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();