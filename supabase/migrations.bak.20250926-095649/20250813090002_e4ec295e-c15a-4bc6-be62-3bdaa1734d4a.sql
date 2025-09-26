-- Fix Security Definer View issue by properly securing user_organization_access view
-- Drop the existing view that has overly permissive grants
DROP VIEW IF EXISTS public.user_organization_access;

-- Recreate the view with proper structure (this will be a regular view, not SECURITY DEFINER)
CREATE VIEW public.user_organization_access AS 
SELECT 
    om.user_id,
    om.organization_id,
    om.role,
    o.name AS organization_name,
    o.organization_type,
    (om.role = ANY (ARRAY['admin'::text, 'owner'::text])) AS can_upload,
    (om.role = ANY (ARRAY['admin'::text, 'owner'::text, 'assessor'::text])) AS can_view_documents,
    o.linked_domains
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id;

-- Enable RLS on the view
ALTER VIEW public.user_organization_access SET (security_barrier = true);

-- Grant minimal necessary permissions - only to authenticated users
REVOKE ALL ON public.user_organization_access FROM anon;
REVOKE ALL ON public.user_organization_access FROM public;

-- Grant SELECT only to authenticated users (they still need to pass RLS on underlying tables)
GRANT SELECT ON public.user_organization_access TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Users can only see their own organization access" 
ON public.user_organization_access
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());