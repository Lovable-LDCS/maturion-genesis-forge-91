-- Final cleanup: Remove duplicate triggers
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;

-- Verify we only have the essential triggers we want:
-- 1. BEFORE INSERT trigger to set owner_id
-- 2. AFTER INSERT trigger to create owner membership  
-- 3. BEFORE UPDATE triggers for updated_at timestamps

-- The triggers that should remain are:
-- organizations: set_organization_owner_trigger (BEFORE INSERT)
-- organizations: handle_new_organization_trigger (AFTER INSERT) 
-- organizations: update_organizations_updated_at (BEFORE UPDATE)
-- organization_members: update_organization_members_updated_at (BEFORE UPDATE)