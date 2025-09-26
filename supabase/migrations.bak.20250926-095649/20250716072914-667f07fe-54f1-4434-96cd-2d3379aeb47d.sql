-- Temporarily drop all policies that reference organization_members itself
-- We'll rebuild them properly after organization creation works

DROP POLICY "Users can view organization members" ON public.organization_members;
DROP POLICY "Admin members can delete other members" ON public.organization_members;
DROP POLICY "Admin members can update other members" ON public.organization_members;

-- Keep only the policies that reference organizations table only
-- These should remain:
-- "Organization owners can insert members" (INSERT)
-- "Organization owners can delete any member" (DELETE) 
-- "Organization owners can update any member" (UPDATE)