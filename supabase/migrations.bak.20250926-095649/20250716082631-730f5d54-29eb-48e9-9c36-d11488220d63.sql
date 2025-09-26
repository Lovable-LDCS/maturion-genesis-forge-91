-- Create team member invitation system
-- This supports email-based invitations with role assignment

-- Create enum for invitation status
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

-- Create organization invitations table
CREATE TABLE public.organization_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'assessor', 'viewer')),
  status invitation_status NOT NULL DEFAULT 'pending',
  invitation_token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE (organization_id, email), -- Prevent duplicate invitations
  UNIQUE (invitation_token) -- Ensure token uniqueness
);

-- Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_invitations
CREATE POLICY "Organization owners can manage invitations"
  ON public.organization_invitations
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_id AND owner_id = auth.uid()
  ));

CREATE POLICY "Organization admins can manage invitations"
  ON public.organization_invitations
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    JOIN public.organizations o ON om.organization_id = o.id
    WHERE om.organization_id = organization_invitations.organization_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
  ));

CREATE POLICY "Users can view invitations sent to their email"
  ON public.organization_invitations
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Add updated_at trigger
CREATE TRIGGER update_organization_invitations_updated_at
  BEFORE UPDATE ON public.organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE public.organization_invitations IS 'Stores pending invitations for organization team members';
COMMENT ON COLUMN public.organization_invitations.invitation_token IS 'Unique token used for accepting invitations via email links';
COMMENT ON COLUMN public.organization_invitations.expires_at IS 'Invitation expiry date (default: 7 days from creation)';

-- Create function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token_param UUID)
RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
  new_member_id UUID;
BEGIN
  -- Find the invitation
  SELECT * INTO invitation_record 
  FROM public.organization_invitations 
  WHERE invitation_token = invitation_token_param 
    AND status = 'pending' 
    AND expires_at > now();
  
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
    'role', invitation_record.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;