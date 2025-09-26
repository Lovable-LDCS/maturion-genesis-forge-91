-- COMPLETE CLEAN SLATE: Remove all accumulated RLS policies and triggers, rebuild minimal setup

-- 1️⃣ Drop ALL existing RLS policies on organizations table
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can delete" ON public.organizations;
DROP POLICY IF EXISTS "Users can view accessible organizations" ON public.organizations;

-- 2️⃣ Drop ALL existing RLS policies on organization_members table
DROP POLICY IF EXISTS "Members: Users can view their own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Members: Triggers can insert (for auto-owner creation)" ON public.organization_members;
DROP POLICY IF EXISTS "Members: Organization owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Members: Organization owners can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Members: Organization owners can delete members" ON public.organization_members;
DROP POLICY IF EXISTS "Members: Owners can manage members (non-trigger)" ON public.organization_members;
DROP POLICY IF EXISTS "Triggers can insert" ON public.organization_members;

-- 3️⃣ Drop ALL triggers on organizations table
DROP TRIGGER IF EXISTS handle_new_organization_trigger ON public.organizations;
DROP TRIGGER IF EXISTS set_organization_owner_trigger ON public.organizations;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;

-- 4️⃣ Drop the handle_new_organization trigger function
DROP FUNCTION IF EXISTS public.handle_new_organization();

-- 5️⃣ Recreate ONLY essential policies for organizations
CREATE POLICY "Authenticated can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can update their organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their organizations"
ON public.organizations
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- 6️⃣ Set owner_id default
ALTER TABLE public.organizations 
ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- 7️⃣ Recreate ONLY essential policies for organization_members
CREATE POLICY "Triggers can insert members"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their memberships"
ON public.organization_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 8️⃣ Recreate handle_new_organization function (minimal and clean)
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9️⃣ Add the trigger back to organizations (clean)
CREATE TRIGGER handle_new_organization_trigger
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();

-- 🔟 Ensure RLS is enabled on both tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;