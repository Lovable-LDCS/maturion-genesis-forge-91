-- Fix remaining security issues identified by linter

-- 1. Fix the security definer view issue by dropping it
DROP VIEW IF EXISTS public.user_organization_access;

-- 2. Recreate as a standard view (not security definer)
CREATE VIEW public.user_organization_access AS
SELECT 
  om.user_id,
  om.organization_id,
  om.role,
  o.name as organization_name,
  o.organization_type,
  (om.role IN ('admin', 'owner')) as can_upload,
  (om.role IN ('admin', 'owner', 'assessor')) as can_view_documents,
  o.linked_domains
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id;