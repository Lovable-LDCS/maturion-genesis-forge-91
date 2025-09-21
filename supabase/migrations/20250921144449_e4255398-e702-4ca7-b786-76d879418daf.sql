-- SECURITY FIX: Phase 2 - Database Function Hardening Only
-- Fix database functions missing search_path (critical security fix)

-- Fix functions that are missing SET search_path TO 'public'
-- This prevents SQL injection and search_path manipulation attacks
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
  'PHASE_2_FUNCTION_SECURITY_APPLIED',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Hardened 11 database functions with search_path protection against SQL injection and path manipulation attacks'
);