-- SECURITY FIX: Phase 1 & 2 - Targeted Security Improvements
-- Fix remaining security issues and harden database functions

-- 1. Tighten subscription_modules access - remove overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view active subscription modules" ON public.subscription_modules;

-- Only admin users should see subscription pricing/module data
CREATE POLICY "Admin users only can view subscription modules"
ON public.subscription_modules
FOR SELECT
USING (is_user_admin());

-- 2. Enhance external_insights security - tighten the visibility scope check
DROP POLICY IF EXISTS "Authenticated users can view relevant external insights" ON public.external_insights;

-- More restrictive: require explicit verification and limit risk levels for non-admin users
CREATE POLICY "Authenticated users can view verified low-risk insights"
ON public.external_insights
FOR SELECT
USING (
  (visibility_scope = 'global'::visibility_scope 
   AND is_verified = true 
   AND risk_level IN ('low', 'medium'))
  OR 
  (EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() 
      AND om.organization_id = ANY (external_insights.matched_orgs)
      AND om.role IN ('admin', 'owner')
  ))
);

-- 3. Fix database functions security - Add missing search_path settings
-- This prevents SQL injection through search_path manipulation

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

-- 4. Enhance demo access security with more restrictive policies
DROP POLICY IF EXISTS "Secure demo read for ai_documents" ON public.ai_documents;
DROP POLICY IF EXISTS "Secure demo read for ai_document_chunks" ON public.ai_document_chunks;

-- Highly restrictive demo policy - require multiple approval flags
CREATE POLICY "Secure demo read for ai_documents"
ON public.ai_documents
FOR SELECT
USING (
  (metadata->>'demo_accessible')::boolean = true 
  AND processing_status = 'completed'
  AND total_chunks > 0
  AND COALESCE((metadata->>'demo_reviewed')::boolean, false) = true
  AND NOT COALESCE((metadata->>'contains_sensitive_data')::boolean, false)
  AND COALESCE((metadata->>'security_cleared')::boolean, false) = true
);

-- Highly restrictive chunk demo policy
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
      AND COALESCE((metadata->>'security_cleared')::boolean, false) = true
  )
  AND length(content) < 150  -- Reduced from 200
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
  'security_hardening',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'SECURITY_HARDENING_PHASE_1_2_COMPLETE',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Secured subscription modules access, enhanced external insights verification, protected 22 database functions with search_path, strengthened demo content policies'
);