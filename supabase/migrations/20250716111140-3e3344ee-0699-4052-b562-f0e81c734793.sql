-- Fix RLS policy for invitation acceptance flow
-- Add policy to allow viewing organization details when accepting invitations

CREATE POLICY "Organizations: Allow viewing for valid invitations"
  ON public.organizations
  FOR SELECT
  USING (
    -- Allow viewing if there's a valid pending invitation for this organization
    EXISTS (
      SELECT 1 
      FROM public.organization_invitations oi
      WHERE oi.organization_id = organizations.id
        AND oi.status = 'pending'
        AND oi.expires_at > now()
        AND oi.email = (
          SELECT email 
          FROM auth.users 
          WHERE id = auth.uid()
        )
    )
  );

-- Update accept_invitation function to return organization details
-- This eliminates the need for a separate organization query from frontend
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token_param uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  invitation_record RECORD;
  org_record RECORD;
  new_member_id UUID;
BEGIN
  -- Find the invitation with organization details
  SELECT 
    oi.*,
    o.name as org_name,
    o.description as org_description
  INTO invitation_record 
  FROM public.organization_invitations oi
  JOIN public.organizations o ON oi.organization_id = o.id
  WHERE oi.invitation_token = invitation_token_param 
    AND oi.status = 'pending' 
    AND oi.expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = invitation_record.organization_id 
      AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this organization');
  END IF;
  
  -- Create the membership
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (invitation_record.organization_id, auth.uid(), invitation_record.role)
  RETURNING id INTO new_member_id;
  
  -- Mark invitation as accepted
  UPDATE public.organization_invitations 
  SET status = 'accepted', updated_at = now()
  WHERE id = invitation_record.id;
  
  RETURN json_build_object(
    'success', true, 
    'member_id', new_member_id,
    'organization_id', invitation_record.organization_id,
    'organization_name', invitation_record.org_name,
    'organization_description', invitation_record.org_description,
    'role', invitation_record.role
  );
END;
$function$;