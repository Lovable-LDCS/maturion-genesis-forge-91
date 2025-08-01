-- Remove the problematic security definer view
DROP VIEW IF EXISTS public.user_organization_access;

-- Create a standard view instead (without SECURITY DEFINER)
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