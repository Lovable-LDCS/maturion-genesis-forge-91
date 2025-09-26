-- Fix Team Management page infinite recursion by cleaning up organizations RLS policies
-- Remove all conflicting SELECT policies and create one comprehensive policy

-- Drop all existing SELECT policies on organizations
DROP POLICY IF EXISTS "Organizations: Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organizations: Users can view their member organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organizations: Allow viewing for pending invitations" ON public.organizations;

-- Create a single, comprehensive SELECT policy that covers all cases
CREATE POLICY "Organizations: Allow viewing by owners, members, and invited users"
  ON public.organizations
  FOR SELECT
  USING (
    -- Owner access
    auth.uid() = owner_id 
    OR 
    -- Member access (simple subquery without joins)
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organizations.id 
        AND user_id = auth.uid()
    )
    OR
    -- Invited user access (for invitation acceptance flow)
    -- Use a safer approach that doesn't access auth.users directly
    EXISTS (
      SELECT 1 FROM public.organization_invitations
      WHERE organization_id = organizations.id
        AND status = 'pending'
        AND expires_at > now()
        AND email = (auth.jwt() ->> 'email')::text
    )
  );

-- Clean up any duplicate or orphaned organization memberships
DELETE FROM public.organization_members om1
WHERE EXISTS (
  SELECT 1 FROM public.organization_members om2
  WHERE om2.organization_id = om1.organization_id
    AND om2.user_id = om1.user_id
    AND om2.id > om1.id
);

-- Clean up any invitations for organizations that don't exist
DELETE FROM public.organization_invitations
WHERE organization_id NOT IN (SELECT id FROM public.organizations);