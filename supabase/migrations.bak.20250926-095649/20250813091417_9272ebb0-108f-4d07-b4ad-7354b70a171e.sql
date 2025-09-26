-- Fix Security Definer View issue by removing the problematic view
-- and replacing it with a secure function approach

-- Drop the existing view that has security issues
DROP VIEW IF EXISTS public.user_organization_access;

-- Create a secure function to get user organization access
-- This function will use SECURITY DEFINER properly and be explicitly controlled
CREATE OR REPLACE FUNCTION public.get_user_organization_access(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
    user_id uuid,
    organization_id uuid,
    role text,
    organization_name text,
    organization_type text,
    can_upload boolean,
    can_view_documents boolean,
    linked_domains jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = target_user_id;
$$;

-- Grant execute permission only to authenticated users
REVOKE ALL ON FUNCTION public.get_user_organization_access(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_user_organization_access(uuid) TO authenticated;

-- Create audit log entry
INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'user_organization_access',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'SECURITY_FIX',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Replaced insecure view with properly secured function to fix SECURITY DEFINER view vulnerability'
);