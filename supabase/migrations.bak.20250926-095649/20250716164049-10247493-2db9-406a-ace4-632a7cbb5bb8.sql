-- COMPREHENSIVE FIX: Remove all RLS conflicts and ensure organization creation works

-- 1. Temporarily disable triggers to avoid conflicts during policy updates
ALTER TABLE public.organizations DISABLE TRIGGER handle_new_organization_trigger;

-- 2. Drop and recreate organization policies with proper order
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- 3. Create a simple INSERT policy that just checks authentication
CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4. Fix organization_members policies to avoid conflicts
-- Drop the restrictive policy that checks if organization exists
DROP POLICY IF EXISTS "Members: Organization owners can manage members" ON public.organization_members;

-- Keep only the permissive trigger policy for INSERT
-- (the "Members: Triggers can insert" policy already exists with WITH CHECK (true))

-- 5. Create a new policy for organization owners to manage members (without affecting triggers)
CREATE POLICY "Members: Owners can manage members (non-trigger)" 
ON public.organization_members 
FOR INSERT 
TO authenticated 
WITH CHECK (
  -- Only apply this policy to non-trigger inserts
  -- Triggers will use the "Members: Triggers can insert" policy instead
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_members.organization_id 
      AND owner_id = auth.uid()
  )
);

-- 6. Re-enable the trigger
ALTER TABLE public.organizations ENABLE TRIGGER handle_new_organization_trigger;

-- 7. Make sure the trigger function is properly configured
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert membership record for the new organization owner
  -- This will use the "Members: Triggers can insert" policy (WITH CHECK true)
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Verify owner_id defaults are set correctly
ALTER TABLE public.organizations 
ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- 9. Ensure RLS is enabled
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;