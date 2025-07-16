-- === MATURION SUPABASE CLEANUP & REFACTOR ===
-- This migration performs a comprehensive cleanup of our Supabase setup
-- removing duplicate policies, unused functions, and ensuring a clean baseline

-- ============================================================================
-- STEP 1: CLEAN UP DUPLICATE AND CONFLICTING POLICIES
-- ============================================================================

-- Clean up ORGANIZATIONS table policies first
-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can delete their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owner can update own organization" ON public.organizations;
DROP POLICY IF EXISTS "Owner can delete own organization" ON public.organizations;
DROP POLICY IF EXISTS "Anyone can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owner can select own organization" ON public.organizations;

-- Create clean, final policies for ORGANIZATIONS
CREATE POLICY "Organizations: Users can create (trigger sets owner)"
  ON public.organizations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Organizations: Users can view their organizations"
  ON public.organizations
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Organizations: Owners can update their organizations"
  ON public.organizations
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Organizations: Owners can delete their organizations"
  ON public.organizations
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Clean up ORGANIZATION_MEMBERS table policies
-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "User can view their memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Allow inserts from triggers" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can delete members" ON public.organization_members;

-- Create clean, final policies for ORGANIZATION_MEMBERS
CREATE POLICY "Members: Users can view their own memberships"
  ON public.organization_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Members: Triggers can insert (for auto-owner creation)"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Members: Organization owners can manage members"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_id AND owner_id = auth.uid()
  ));

CREATE POLICY "Members: Organization owners can update members"
  ON public.organization_members
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_id AND owner_id = auth.uid()
  ));

CREATE POLICY "Members: Organization owners can delete members"
  ON public.organization_members
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_id AND owner_id = auth.uid()
  ));

-- ============================================================================
-- STEP 2: CLEAN UP FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Drop the old set_owner_after_insert function (we'll use a proper BEFORE INSERT trigger)
DROP FUNCTION IF EXISTS public.set_owner_after_insert() CASCADE;

-- Drop any old organization owner setting function
DROP FUNCTION IF EXISTS public.set_organization_owner() CASCADE;

-- Create a clean BEFORE INSERT trigger function for organizations
CREATE OR REPLACE FUNCTION public.set_organization_owner_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Always set owner_id to current authenticated user
  NEW.owner_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the BEFORE INSERT trigger for organizations
DROP TRIGGER IF EXISTS set_organization_owner_trigger ON public.organizations;
DROP TRIGGER IF EXISTS set_owner_after_insert_trigger ON public.organizations;
CREATE TRIGGER set_organization_owner_trigger
  BEFORE INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_owner_before_insert();

-- Ensure the AFTER INSERT trigger for organization members exists and is clean
DROP TRIGGER IF EXISTS handle_new_organization_trigger ON public.organizations;
CREATE TRIGGER handle_new_organization_trigger
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();

-- ============================================================================
-- STEP 3: VERIFY DATA INTEGRITY
-- ============================================================================

-- The current APGI organization and owner membership should remain untouched
-- This cleanup only affects policies, triggers, and functions - not data

-- ============================================================================
-- STEP 4: ADD HELPFUL COMMENTS FOR FUTURE MAINTENANCE
-- ============================================================================

COMMENT ON TABLE public.organizations IS 'Stores organization/company information with owner-based access control';
COMMENT ON TABLE public.organization_members IS 'Stores organization membership with role-based permissions';
COMMENT ON FUNCTION public.set_organization_owner_before_insert() IS 'Automatically sets organization owner to current user during creation';
COMMENT ON FUNCTION public.handle_new_organization() IS 'Automatically creates owner membership when organization is created';