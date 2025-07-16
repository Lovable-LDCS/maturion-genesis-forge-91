-- Fix organization_invitations RLS policies for better functionality and count(*) support

-- 1️⃣ Fix the overly restrictive SELECT policy that blocks count(*) and other aggregate queries
DROP POLICY IF EXISTS "Allow viewing invitations by valid token" ON public.organization_invitations;

-- Create a proper SELECT policy that allows users to see invitations they can manage
CREATE POLICY "Users can view organization invitations"
  ON public.organization_invitations
  FOR SELECT
  TO authenticated
  USING (
    -- Organization owners can see all invitations for their org
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE id = organization_invitations.organization_id 
        AND owner_id = auth.uid()
    )
    OR
    -- Organization admins can see all invitations for their org
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = organization_invitations.organization_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
    OR
    -- Users can see invitations sent to their email (for token-based acceptance)
    (email = (auth.jwt() ->> 'email'::text) AND status = 'pending' AND expires_at > now())
  );

-- 2️⃣ Ensure INSERT policy allows admins to create invitations
-- The existing INSERT policies should be working, but let's make them explicit
DROP POLICY IF EXISTS "Organization owners can manage invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Organization admins can manage invitations" ON public.organization_invitations;

-- Separate INSERT policy for clarity
CREATE POLICY "Organization owners and admins can create invitations"
  ON public.organization_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Organization owners can create invitations
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE id = organization_invitations.organization_id 
        AND owner_id = auth.uid()
    )
    OR
    -- Organization admins can create invitations
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = organization_invitations.organization_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
  );

-- 3️⃣ UPDATE and DELETE policies for managing invitations
CREATE POLICY "Organization owners and admins can update invitations"
  ON public.organization_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE id = organization_invitations.organization_id 
        AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = organization_invitations.organization_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Organization owners and admins can delete invitations"
  ON public.organization_invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE id = organization_invitations.organization_id 
        AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = organization_invitations.organization_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
  );