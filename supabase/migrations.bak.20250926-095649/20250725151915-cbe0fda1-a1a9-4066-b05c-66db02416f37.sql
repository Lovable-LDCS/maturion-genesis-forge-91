-- Fix the SECURITY DEFINER view issue by recreating it without SECURITY DEFINER
-- The user_organization_invitations view doesn't need SECURITY DEFINER as it has proper RLS

DROP VIEW IF EXISTS public.user_organization_invitations;

-- Recreate the view without SECURITY DEFINER (just a normal view)
CREATE VIEW public.user_organization_invitations AS 
SELECT 
    i.id,
    i.organization_id,
    i.invited_by,
    i.email,
    i.role,
    i.status,
    i.invitation_token,
    i.expires_at,
    i.created_at,
    i.updated_at,
    o.name AS organization_name
FROM organization_invitations i
JOIN organizations o ON i.organization_id = o.id
WHERE user_can_manage_org_invitations(i.organization_id) 
   OR (i.email = (auth.jwt() ->> 'email'::text) 
       AND i.status = 'pending'::invitation_status 
       AND i.expires_at > now());

-- Let's check the current configuration of our functions to see which ones still need search_path
SELECT 
    p.proname as function_name,
    p.prosecdef as security_definer,
    p.proconfig as config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'accept_invitation',
    'user_can_view_organization', 
    'user_can_manage_org_invitations',
    'is_user_admin'
  )
ORDER BY p.proname;