-- Drop the problematic policies
DROP POLICY "Organization admins can insert members" ON public.organization_members;
DROP POLICY "Organization admins can update members" ON public.organization_members;
DROP POLICY "Organization admins can delete members" ON public.organization_members;

-- Create new policies that avoid recursion
-- Allow organization owners to insert members (this fixes the initial owner insertion)
CREATE POLICY "Organization owners can insert members" 
ON public.organization_members 
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_members.organization_id 
    AND owner_id = auth.uid()
  )
);

-- Allow existing admins/owners to insert members (for later member additions)
CREATE POLICY "Existing admins can insert members" 
ON public.organization_members 
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members existing 
    WHERE existing.organization_id = organization_members.organization_id 
    AND existing.user_id = auth.uid() 
    AND existing.role IN ('owner', 'admin')
    AND existing.user_id != organization_members.user_id  -- Prevent self-reference
  )
);

-- Allow organization owners to update members
CREATE POLICY "Organization owners can update members" 
ON public.organization_members 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_members.organization_id 
    AND owner_id = auth.uid()
  )
);

-- Allow existing admins/owners to update members
CREATE POLICY "Existing admins can update members" 
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

-- Allow organization owners to delete members
CREATE POLICY "Organization owners can delete members" 
ON public.organization_members 
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_members.organization_id 
    AND owner_id = auth.uid()
  )
);

-- Allow existing admins/owners to delete members
CREATE POLICY "Existing admins can delete members" 
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