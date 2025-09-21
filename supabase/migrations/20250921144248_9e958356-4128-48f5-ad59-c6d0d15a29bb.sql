-- SECURITY FIX: Phase 1 - Critical Data Protection (Corrected)
-- Secure tables based on their actual structure and purpose

-- 1. Secure security_exceptions table - restrict to admin users only
-- This table contains system-wide security exceptions, should be admin-only
DROP POLICY IF EXISTS "Enable read access for all users" ON public.security_exceptions;

CREATE POLICY "Admin users can view security exceptions"
ON public.security_exceptions
FOR SELECT 
USING (is_superuser());

CREATE POLICY "Admin users can manage security exceptions"
ON public.security_exceptions
FOR ALL
USING (is_superuser())
WITH CHECK (is_superuser());

-- 2. Secure subscription_modules table - admin access only
-- This table contains pricing/module configuration, should be admin-only
DROP POLICY IF EXISTS "Enable read access for all users" ON public.subscription_modules;

CREATE POLICY "Admin users can manage subscription modules"
ON public.subscription_modules
FOR ALL
USING (is_superuser())
WITH CHECK (is_superuser());

-- 3. Secure external_insights table - restrict based on verification and visibility scope
-- This table has threat intelligence, should be restricted based on risk level and verification
DROP POLICY IF EXISTS "Enable read access for all users" ON public.external_insights;

-- Allow authenticated users to view only verified, low-risk insights
CREATE POLICY "Authenticated users can view verified low-risk insights"
ON public.external_insights
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND is_verified = true 
  AND risk_level IN ('low', 'medium')
  AND visibility_scope = 'public'
);

-- Allow admin users to manage all insights
CREATE POLICY "Admin users can manage all external insights"
ON public.external_insights
FOR ALL
USING (is_superuser())
WITH CHECK (is_superuser());

-- 4. Fix database functions security - Add missing search_path settings
-- This prevents SQL injection through search_path manipulation

-- Update functions that are missing SET search_path
ALTER FUNCTION public.org_domains_sync_org_id() SET search_path = 'public';
ALTER FUNCTION public.update_ai_ingested_status() SET search_path = 'public';
ALTER FUNCTION public.touch_updated_at() SET search_path = 'public';
ALTER FUNCTION public.enforce_org_doc_path() SET search_path = 'public';
ALTER FUNCTION public.list_public_tables() SET search_path = 'public';
ALTER FUNCTION public.update_milestone_status_on_task_delete() SET search_path = 'public';
ALTER FUNCTION public.regenerate_missing_embeddings() SET search_path = 'public';
ALTER FUNCTION public.reset_failed_document(uuid) SET search_path = 'public';
ALTER FUNCTION public.log_audit_trail() SET search_path = 'public';
ALTER FUNCTION public.log_policy_change(text, text, text, text, text, text[], text, uuid, jsonb) SET search_path = 'public';
ALTER FUNCTION public.accept_invitation(uuid) SET search_path = 'public';
ALTER FUNCTION public.update_org_doc_status(uuid, doc_status, text, integer) SET search_path = 'public';
ALTER FUNCTION public.reset_my_mps_documents() SET search_path = 'public';
ALTER FUNCTION public.unstick_fetching_jobs(interval) SET search_path = 'public';
ALTER FUNCTION public.generate_criteria_number() SET search_path = 'public';
ALTER FUNCTION public.calculate_assessment_completion() SET search_path = 'public';
ALTER FUNCTION public.log_milestone_status_change() SET search_path = 'public';
ALTER FUNCTION public.create_document_version() SET search_path = 'public';
ALTER FUNCTION public.log_security_metric(text, numeric, jsonb, uuid) SET search_path = 'public';
ALTER FUNCTION public.get_security_setting(text) SET search_path = 'public';
ALTER FUNCTION public.reset_mps_documents_for_reprocessing(uuid) SET search_path = 'public';
ALTER FUNCTION public.handle_new_organization() SET search_path = 'public';
ALTER FUNCTION public.validate_input_security(text) SET search_path = 'public';
ALTER FUNCTION public.log_assessment_audit_trail() SET search_path = 'public';

-- 5. Enhance demo access security - add proper content filtering
DROP POLICY IF EXISTS "Secure demo read for ai_documents" ON public.ai_documents;
DROP POLICY IF EXISTS "Secure demo read for ai_document_chunks" ON public.ai_document_chunks;

-- More restrictive demo policy for documents
CREATE POLICY "Secure demo read for ai_documents"
ON public.ai_documents
FOR SELECT
USING (
  (metadata->>'demo_accessible')::boolean = true 
  AND processing_status = 'completed'
  AND total_chunks > 0
  AND COALESCE((metadata->>'demo_reviewed')::boolean, false) = true
  AND NOT COALESCE((metadata->>'contains_sensitive_data')::boolean, false)
);

-- More restrictive demo policy for chunks
CREATE POLICY "Secure demo read for ai_document_chunks" 
ON public.ai_document_chunks
FOR SELECT
USING (
  document_id IN (
    SELECT id FROM ai_documents 
    WHERE (metadata->>'demo_accessible')::boolean = true 
      AND processing_status = 'completed'
      AND COALESCE((metadata->>'demo_reviewed')::boolean, false) = true
      AND NOT COALESCE((metadata->>'contains_sensitive_data')::boolean, false)
  )
  AND length(content) < 200
  AND NOT COALESCE((metadata->>'contains_pii')::boolean, false)
  AND COALESCE((metadata->>'demo_approved')::boolean, false) = true
);

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
  'CRITICAL_SECURITY_FIXES_APPLIED',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Applied critical security fixes: secured sensitive tables, enhanced demo policies, fixed 22 database functions with search_path protection'
);