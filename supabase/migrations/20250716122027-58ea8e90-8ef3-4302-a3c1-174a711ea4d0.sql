-- Fix RLS policy for organization_invitations to support COUNT(*) and aggregation queries

-- 1️⃣ Drop the current restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view organization invitations" ON public.organization_invitations;

-- 2️⃣ Create a security definer function to check if user can view invitations for an org
CREATE OR REPLACE FUNCTION public.user_can_manage_org_invitations(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    -- User is organization owner
    SELECT 1 FROM public.organizations 
    WHERE id = org_id AND owner_id = auth.uid()
  ) OR EXISTS (
    -- User is organization admin/owner member
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = org_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'owner')
  );
$$;

-- 3️⃣ Create a new SELECT policy that supports aggregation better
CREATE POLICY "Users can view accessible organization invitations"
  ON public.organization_invitations
  FOR SELECT
  TO authenticated
  USING (
    -- Allow access if user can manage this organization
    public.user_can_manage_org_invitations(organization_id)
    OR
    -- Allow users to see their own pending invitations (for acceptance)
    (
      email = (auth.jwt() ->> 'email'::text) 
      AND status = 'pending' 
      AND expires_at > now()
    )
  );

-- 4️⃣ Create a view for dashboard purposes that handles aggregation safely
CREATE OR REPLACE VIEW public.user_organization_invitations AS
SELECT 
  i.*,
  o.name as organization_name
FROM public.organization_invitations i
JOIN public.organizations o ON i.organization_id = o.id
WHERE 
  -- User can manage this organization
  public.user_can_manage_org_invitations(i.organization_id)
  OR 
  -- User has pending invitation
  (
    i.email = (auth.jwt() ->> 'email'::text) 
    AND i.status = 'pending' 
    AND i.expires_at > now()
  );

-- 5️⃣ Enable RLS on the view
ALTER VIEW public.user_organization_invitations SET (security_barrier = true);

-- 6️⃣ Grant access to the view
GRANT SELECT ON public.user_organization_invitations TO authenticated;