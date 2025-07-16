-- Drop the conflicting INSERT policies
DROP POLICY "Organization owners can insert any member" ON public.organization_members;
DROP POLICY "Admin members can insert other members" ON public.organization_members;

-- Create a single, clear INSERT policy that handles both cases without conflict
CREATE POLICY "Insert members policy" 
ON public.organization_members 
FOR INSERT
WITH CHECK (
  -- Case 1: Organization owner can insert anyone (including themselves as first member)
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_members.organization_id 
    AND owner_id = auth.uid()
  )
  OR
  -- Case 2: Existing admin/owner members can insert others (not themselves)
  (
    auth.uid() != organization_members.user_id 
    AND EXISTS (
      SELECT 1 FROM public.organization_members existing 
      WHERE existing.organization_id = organization_members.organization_id 
      AND existing.user_id = auth.uid() 
      AND existing.role IN ('owner', 'admin')
    )
  )
);