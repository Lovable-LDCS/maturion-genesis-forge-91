-- Drop ALL existing policies on organization_members to start fresh
DROP POLICY "Users can view organization members for organizations they belong to" ON public.organization_members;
DROP POLICY "Organization owners can manage members" ON public.organization_members;
DROP POLICY "Organization owners can insert members" ON public.organization_members;
DROP POLICY "Existing admins can insert members" ON public.organization_members;
DROP POLICY "Organization owners can update members" ON public.organization_members;
DROP POLICY "Existing admins can update members" ON public.organization_members;
DROP POLICY "Organization owners can delete members" ON public.organization_members;
DROP POLICY "Existing admins can delete members" ON public.organization_members;

-- Create clean, non-conflicting policies

-- SELECT: Users can view members of organizations they belong to
CREATE POLICY "Users can view organization members" 
ON public.organization_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.organization_id = organization_members.organization_id 
    AND om.user_id = auth.uid()
  )
);

-- INSERT: Organization owners can insert ANY member (including themselves as first member)
CREATE POLICY "Organization owners can insert any member" 
ON public.organization_members 
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_members.organization_id 
    AND owner_id = auth.uid()
  )
);

-- INSERT: Existing admin/owner members can insert other members 
CREATE POLICY "Admin members can insert other members" 
ON public.organization_members 
FOR INSERT
WITH CHECK (
  auth.uid() != organization_members.user_id  -- Can't insert themselves (only for adding others)
  AND EXISTS (
    SELECT 1 FROM public.organization_members existing 
    WHERE existing.organization_id = organization_members.organization_id 
    AND existing.user_id = auth.uid() 
    AND existing.role IN ('owner', 'admin')
  )
);

-- UPDATE: Organization owners can update any member
CREATE POLICY "Organization owners can update any member" 
ON public.organization_members 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_members.organization_id 
    AND owner_id = auth.uid()
  )
);

-- UPDATE: Admin members can update other members
CREATE POLICY "Admin members can update other members" 
ON public.organization_members 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members existing 
    WHERE existing.organization_id = organization_members.organization_id 
    AND existing.user_id = auth.uid() 
    AND existing.role IN ('owner', 'admin')
  )
);

-- DELETE: Organization owners can delete any member
CREATE POLICY "Organization owners can delete any member" 
ON public.organization_members 
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_members.organization_id 
    AND owner_id = auth.uid()
  )
);

-- DELETE: Admin members can delete other members
CREATE POLICY "Admin members can delete other members" 
ON public.organization_members 
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members existing 
    WHERE existing.organization_id = organization_members.organization_id 
    AND existing.user_id = auth.uid() 
    AND existing.role IN ('owner', 'admin')
  )
);