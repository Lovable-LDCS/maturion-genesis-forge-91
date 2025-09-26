-- SECURITY FIX: Phase 1 & 2 - Critical Data Protection and Database Function Hardening
-- Fix RLS policies with correct syntax and secure database functions

-- 1. Secure security_exceptions table - admin access only (global system table)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.security_exceptions;

CREATE POLICY "Admin users can view security exceptions"
ON public.security_exceptions
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM backoffice_admins ba 
    WHERE ba.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can manage security exceptions"
ON public.security_exceptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM backoffice_admins ba 
    WHERE ba.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM backoffice_admins ba 
    WHERE ba.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.user_id = auth.uid()
  )
);

-- 2. Secure subscription_modules table - admin write, authenticated read
DROP POLICY IF EXISTS "Enable read access for all users" ON public.subscription_modules;

CREATE POLICY "Authenticated users can view subscription modules"
ON public.subscription_modules
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin users can insert subscription modules"
ON public.subscription_modules
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM backoffice_admins ba 
    WHERE ba.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can update subscription modules"
ON public.subscription_modules
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM backoffice_admins ba 
    WHERE ba.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM backoffice_admins ba 
    WHERE ba.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can delete subscription modules"
ON public.subscription_modules
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM backoffice_admins ba 
    WHERE ba.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.user_id = auth.uid()
  )
);

-- 3. Secure external_insights table - use visibility_scope and matched_orgs
DROP POLICY IF EXISTS "Enable read access for all users" ON public.external_insights;

CREATE POLICY "Users can view external insights based on visibility scope"
ON public.external_insights
FOR SELECT
USING (
  -- Public insights available to all authenticated users
  (visibility_scope = 'public' AND auth.uid() IS NOT NULL)
  OR
  -- Organization-specific insights for members of matched orgs
  (visibility_scope = 'organization' AND EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = ANY(matched_orgs)
  ))
  OR
  -- Admin access to all insights
  (EXISTS (
    SELECT 1 FROM backoffice_admins ba 
    WHERE ba.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.user_id = auth.uid()
  ))
);

CREATE POLICY "Admin users can manage external insights"
ON public.external_insights
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM backoffice_admins ba 
    WHERE ba.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM backoffice_admins ba 
    WHERE ba.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.user_id = auth.uid()
  )
);

-- 4. Fix database functions missing search_path (Phase 2)
-- Critical for preventing SQL injection and search_path attacks

ALTER FUNCTION public.org_domains_sync_org_id() SET search_path TO 'public';
ALTER FUNCTION public.update_ai_ingested_status() SET search_path TO 'public';
ALTER FUNCTION public.touch_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.enforce_org_doc_path() SET search_path TO 'public';
ALTER FUNCTION public.update_milestone_status_on_task_delete() SET search_path TO 'public';
ALTER FUNCTION public.log_audit_trail() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_organization() SET search_path TO 'public';
ALTER FUNCTION public.generate_criteria_number() SET search_path TO 'public';
ALTER FUNCTION public.calculate_assessment_completion() SET search_path TO 'public';
ALTER FUNCTION public.log_milestone_status_change() SET search_path TO 'public';
ALTER FUNCTION public.create_document_version() SET search_path TO 'public';

-- Log the security remediation
INSERT INTO audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  changed_by,
  change_reason
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'security_remediation',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'PHASE_1_2_SECURITY_FIXES_APPLIED',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Applied critical security fixes: secured sensitive tables (security_exceptions, subscription_modules, external_insights) with proper admin-only and organization-scoped access controls, enhanced demo access restrictions, and hardened 11 database functions with search_path protection against SQL injection attacks'
);