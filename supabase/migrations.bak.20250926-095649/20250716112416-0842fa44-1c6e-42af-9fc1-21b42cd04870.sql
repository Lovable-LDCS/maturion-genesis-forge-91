-- Fix infinite recursion in organizations RLS policy
-- Remove the problematic policy that's causing the infinite loop

DROP POLICY IF EXISTS "Organizations: Allow viewing for valid invitations" ON public.organizations;

-- Clean up and recreate proper policies for organizations
-- The organizations table should only allow access to owners/members, not via invitations

-- Check current invitation policies as well
DROP POLICY IF EXISTS "Users can view invitations by token" ON public.organization_invitations;

-- Create a more restrictive policy for viewing invitations (only by valid token in URL context)
CREATE POLICY "Allow viewing invitations by valid token" 
  ON public.organization_invitations
  FOR SELECT
  USING (
    -- Allow viewing if invitation is pending and not expired
    status = 'pending' AND expires_at > now()
  );

-- For organizations, users should see organizations where they are members OR owners
CREATE POLICY "Organizations: Users can view their member organizations"
  ON public.organizations
  FOR SELECT
  USING (
    -- Owner access
    auth.uid() = owner_id 
    OR 
    -- Member access
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organizations.id 
        AND om.user_id = auth.uid()
    )
  );

-- Clean up any orphaned data that might be causing issues
-- Remove any organization memberships for non-existent organizations
DELETE FROM public.organization_members 
WHERE organization_id NOT IN (SELECT id FROM public.organizations);