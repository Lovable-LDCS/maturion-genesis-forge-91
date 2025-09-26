-- Add secure SELECT policy for invitation acceptance
-- This allows invited users to view organization details when they have a pending invitation

CREATE POLICY "Organizations: Allow viewing for pending invitations"
  ON public.organizations
  FOR SELECT
  USING (
    -- Allow viewing if there's a pending, non-expired invitation for this organization
    -- where the invitation email matches the current user's auth email
    EXISTS (
      SELECT 1 
      FROM public.organization_invitations oi
      WHERE oi.organization_id = organizations.id
        AND oi.status = 'pending'
        AND oi.expires_at > now()
        AND oi.email = (
          SELECT au.email 
          FROM auth.users au 
          WHERE au.id = auth.uid()
        )
    )
  );

-- Test the policy to ensure it works without infinite recursion
-- This should not cause recursion because:
-- 1. It only affects SELECT operations (not ALL)
-- 2. It queries organization_invitations (not organizations recursively)
-- 3. It makes a single lookup to auth.users (not a policy-triggering operation)