-- Fix infinite recursion in organizations RLS policies

-- 1️⃣ Drop all existing INSERT policies on organizations to start clean
DROP POLICY IF EXISTS "Organizations: Users can create (trigger sets owner)" ON public.organizations;
DROP POLICY IF EXISTS "Anyone can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- 2️⃣ Create a clean INSERT policy that avoids recursion
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- 3️⃣ Audit and fix the SELECT policy to avoid potential recursion
-- The current SELECT policy references organization_members which could cause issues
DROP POLICY IF EXISTS "Organizations: Allow viewing by owners, members, and invited users" ON public.organizations;

-- Create a simplified SELECT policy that uses security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_can_view_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- User is owner
    SELECT 1 FROM public.organizations 
    WHERE id = org_id AND owner_id = auth.uid()
  ) OR EXISTS (
    -- User is member
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = org_id AND user_id = auth.uid()
  ) OR EXISTS (
    -- User has pending invitation
    SELECT 1 FROM public.organization_invitations 
    WHERE organization_id = org_id 
      AND email = (auth.jwt() ->> 'email'::text)
      AND status = 'pending'::invitation_status 
      AND expires_at > now()
  );
$$;

-- Create new SELECT policy using the security definer function
CREATE POLICY "Users can view accessible organizations"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (public.user_can_view_organization(id));

-- 4️⃣ Ensure other policies don't cause recursion
-- The UPDATE and DELETE policies look safe as they only check owner_id directly
-- But let's make them more explicit for clarity

DROP POLICY IF EXISTS "Organizations: Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organizations: Owners can delete their organizations" ON public.organizations;

CREATE POLICY "Organization owners can update"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Organization owners can delete"
  ON public.organizations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);