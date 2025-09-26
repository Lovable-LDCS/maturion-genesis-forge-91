-- Create admin_users table for proper role-based access control
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_users table
CREATE POLICY "Admin users can view admin list" 
ON public.admin_users 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.admin_users au 
  WHERE au.user_id = auth.uid()
));

CREATE POLICY "Only existing admins can grant admin access" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.admin_users au 
  WHERE au.user_id = auth.uid()
));

-- Function to check if user is admin (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_uuid
  );
$$;

-- Insert initial admin users (replace with actual admin user IDs after they sign up)
-- Note: These will need to be updated with real user IDs after the admins create accounts
INSERT INTO public.admin_users (user_id, email, role, granted_by)
SELECT 
  u.id,
  u.email,
  'admin',
  u.id
FROM auth.users u 
WHERE u.email IN ('johan.ras@apginc.ca', 'jorrie.jordaan@apginc.ca')
ON CONFLICT (user_id) DO NOTHING;

-- Update existing RLS policies to use the new admin function
DROP POLICY IF EXISTS "Admin users can view activity log" ON public.admin_activity_log;
CREATE POLICY "Admin users can view activity log" 
ON public.admin_activity_log 
FOR SELECT 
USING (public.is_user_admin());

DROP POLICY IF EXISTS "Admin users can manage approval requests" ON public.admin_approval_requests;
CREATE POLICY "Admin users can manage approval requests" 
ON public.admin_approval_requests 
FOR ALL 
USING (public.is_user_admin());

DROP POLICY IF EXISTS "Admin users can manage discount codes" ON public.discount_codes;
CREATE POLICY "Admin users can manage discount codes" 
ON public.discount_codes 
FOR ALL 
USING (public.is_user_admin());

DROP POLICY IF EXISTS "Admin users can manage subscription modules" ON public.subscription_modules;
CREATE POLICY "Admin users can manage subscription modules" 
ON public.subscription_modules 
FOR ALL 
USING (public.is_user_admin());

DROP POLICY IF EXISTS "Admin users can manage all external insights" ON public.external_insights;
CREATE POLICY "Admin users can manage all external insights" 
ON public.external_insights 
FOR ALL 
USING (public.is_user_admin());