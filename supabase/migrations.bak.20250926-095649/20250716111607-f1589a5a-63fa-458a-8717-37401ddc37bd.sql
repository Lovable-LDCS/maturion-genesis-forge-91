-- Clean up any stuck invitation data and fix the system
-- First, let's check current data and clean up

-- Delete any test invitations that are causing issues
-- Only keep the most recent invitation per email-organization pair
DELETE FROM organization_invitations 
WHERE status = 'pending' 
  AND id NOT IN (
    SELECT DISTINCT ON (email, organization_id) id
    FROM organization_invitations 
    WHERE status = 'pending'
    ORDER BY email, organization_id, created_at DESC
  );

-- Fix the accept_invitation function to properly handle email matching
-- The issue was that it was trying to match email from auth.users table in RLS
-- But accept_invitation function has SECURITY DEFINER which bypasses RLS

CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token_param uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  invitation_record RECORD;
  user_email_var TEXT;
  new_member_id UUID;
BEGIN
  -- Get the current user's email from auth.users
  SELECT email INTO user_email_var 
  FROM auth.users 
  WHERE id = auth.uid();
  
  IF user_email_var IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
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
    AND oi.expires_at > now()
    AND oi.email = user_email_var; -- Match email directly
  
  IF NOT FOUND THEN
    -- Check if invitation exists but with different email
    IF EXISTS (
      SELECT 1 FROM public.organization_invitations 
      WHERE invitation_token = invitation_token_param 
        AND status = 'pending' 
        AND expires_at > now()
    ) THEN
      RETURN json_build_object('success', false, 'error', 'Invitation email does not match your account');
    END IF;
    
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