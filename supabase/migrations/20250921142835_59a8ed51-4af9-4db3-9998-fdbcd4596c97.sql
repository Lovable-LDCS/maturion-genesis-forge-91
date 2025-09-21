-- SECURITY REMEDIATION: Critical Issues Fix
-- Priority 1: Enable RLS on document_types table

ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

-- Add appropriate RLS policy for document_types (should be readable by all org members)
CREATE POLICY "Organization members can view document types"
ON public.document_types
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = document_types.organization_id
      AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage document types"
ON public.document_types
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = document_types.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = document_types.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
  )
);

-- Priority 2: Fix search_path on SECURITY DEFINER functions
-- Functions that need explicit search_path setting to prevent privilege escalation

-- Fix accept_invitation function
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    AND oi.email = user_email_var;
  
  IF NOT FOUND THEN
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

-- Fix calculate_assessment_progress function  
CREATE OR REPLACE FUNCTION public.calculate_assessment_progress(assessment_id_param uuid)
RETURNS TABLE(total_criteria integer, completed_criteria integer, completion_percentage numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(COUNT(c.id)::integer, 0) as total_criteria,
    COALESCE(COUNT(CASE WHEN a_s.status = 'approved_locked' THEN 1 END)::integer, 0) as completed_criteria,
    CASE 
      WHEN COUNT(c.id) > 0 THEN 
        ROUND((COUNT(CASE WHEN a_s.status = 'approved_locked' THEN 1 END)::numeric / COUNT(c.id)::numeric) * 100, 2)
      ELSE 0
    END as completion_percentage
  FROM public.assessments a
  JOIN public.assessment_scores a_s ON a.id = a_s.assessment_id
  JOIN public.criteria c ON a_s.criteria_id = c.id
  WHERE a.id = assessment_id_param;
END;
$function$;