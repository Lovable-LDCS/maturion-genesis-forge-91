-- Ensure RLS is enabled on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Allow inserts from triggers" ON public.organization_members;
DROP POLICY IF EXISTS "User can view their memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can update any member" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can delete any member" ON public.organization_members;

-- Create the essential policies
-- 1. Allow SELECT for users to see their own memberships
CREATE POLICY "User can view their memberships"
  ON public.organization_members
  FOR SELECT
  USING (user_id = auth.uid());

-- 2. Allow INSERT for triggers (needed for AFTER INSERT trigger)
CREATE POLICY "Allow inserts from triggers"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (true);

-- 3. Allow organization owners to manage members
CREATE POLICY "Organization owners can insert members"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_id AND owner_id = auth.uid()
  ));

CREATE POLICY "Organization owners can update members"
  ON public.organization_members
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_id AND owner_id = auth.uid()
  ));

CREATE POLICY "Organization owners can delete members"
  ON public.organization_members
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_id AND owner_id = auth.uid()
  ));