-- Fix the remaining functions that need search_path
CREATE OR REPLACE FUNCTION public.user_can_view_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    -- User is owner
    SELECT 1 FROM public.organizations 
    WHERE id = org_id AND owner_id = auth.uid()
  ) OR EXISTS (
    -- User is member
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = org_id AND user_id = auth.uid()
  ) OR EXISTS (
    -- User has pending invitation
    SELECT 1 FROM public.organization_invitations 
    WHERE organization_id = org_id 
      AND email = (auth.jwt() ->> 'email'::text)
      AND status = 'pending'::invitation_status 
      AND expires_at > now()
  );
$function$;