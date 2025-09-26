-- COMPLETE RLS CLEANUP: Simplify all policies to guarantee organization creation works

-- 1. Drop ALL existing INSERT policies on public.organizations
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated can create organizations" ON public.organizations;

-- 2. Create a single, permissive INSERT policy
CREATE POLICY "Authenticated can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Confirm and enforce owner_id DEFAULT
ALTER TABLE public.organizations 
ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- 4. Ensure RLS is enabled
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 5. Clean up organization_members INSERT policies
DROP POLICY IF EXISTS "Members: Organization owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Members: Owners can manage members (non-trigger)" ON public.organization_members;
DROP POLICY IF EXISTS "Members: Triggers can insert (for auto-owner creation)" ON public.organization_members;
DROP POLICY IF EXISTS "Triggers can insert" ON public.organization_members;

-- 6. Create a simple permissive policy for trigger inserts on organization_members
CREATE POLICY "Triggers can insert"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. Ensure the trigger function is SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert membership record for the new organization owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Ensure RLS is enabled on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;