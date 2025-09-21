-- SECURITY FIX: Phase 1 Critical - Secure Admin Data Access
-- Restrict admin_users table access to admin users only

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Admin users can view admin list" ON public.admin_users;

-- Create a more secure policy that only allows admin users to view the admin list
CREATE POLICY "Only admin users can view admin list" 
ON public.admin_users 
FOR SELECT 
USING (is_user_admin(auth.uid()));

-- Ensure only superusers can manage the admin_users table directly
DROP POLICY IF EXISTS "Restrict admin user creation" ON public.admin_users;

CREATE POLICY "Only superusers can manage admin users" 
ON public.admin_users 
FOR ALL 
USING (is_superuser(auth.uid()))
WITH CHECK (is_superuser(auth.uid()));

-- Log this critical security fix
INSERT INTO audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  changed_by,
  change_reason
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin_users',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'CRITICAL_SECURITY_FIX_ADMIN_ACCESS',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'PHASE 1 CRITICAL: Restricted admin_users table access to admin users only - prevents unauthorized access to sensitive admin information'
);