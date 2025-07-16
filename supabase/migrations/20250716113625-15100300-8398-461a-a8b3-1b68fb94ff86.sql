-- Fix invitation management policies
-- Drop existing complex policies that might have JOIN issues
DROP POLICY IF EXISTS "Owners can manage organization invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Admins can manage organization invitations" ON public.organization_invitations;

-- Create cleaner, more reliable policies
-- Policy 1: Organization owners can manage all invitations for their organizations
CREATE POLICY "Organization owners can manage invitations"
  ON public.organization_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = organization_invitations.organization_id 
        AND owner_id = auth.uid()
    )
  );

-- Policy 2: Organization admins can manage invitations (separate simpler policy)
CREATE POLICY "Organization admins can manage invitations"
  ON public.organization_invitations
  FOR ALL  
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organization_invitations.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- Also ensure the cancel functionality works by testing with a simple query
-- Test: Can current user access invitations for their organization?