-- Fix invitation cancellation issues
-- Clean up and improve RLS policies for organization_invitations

-- Drop existing policies to rebuild them properly
DROP POLICY IF EXISTS "Organization owners can manage invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Organization admins can manage invitations" ON public.organization_invitations;

-- Create improved policies with better logic
-- Policy 1: Organization owners can manage all invitations for their organizations
CREATE POLICY "Owners can manage organization invitations"
  ON public.organization_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_invitations.organization_id 
        AND o.owner_id = auth.uid()
    )
  );

-- Policy 2: Organization admins can manage invitations for their organizations
CREATE POLICY "Admins can manage organization invitations"
  ON public.organization_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      JOIN public.organizations o ON o.id = om.organization_id
      WHERE om.organization_id = organization_invitations.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'owner')
    )
  );

-- Clean up any duplicate or orphaned invitations
-- Remove invitations for non-existent organizations
DELETE FROM public.organization_invitations 
WHERE organization_id NOT IN (SELECT id FROM public.organizations);

-- Remove very old cancelled/expired invitations to keep table clean
DELETE FROM public.organization_invitations 
WHERE status IN ('cancelled', 'expired') 
  AND created_at < (NOW() - INTERVAL '30 days');