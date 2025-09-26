-- Drop the current problematic INSERT policy
DROP POLICY "Insert members policy" ON public.organization_members;

-- Create a cleaner policy structure that prioritizes owner check
-- This policy explicitly handles the owner case first to avoid recursion
CREATE POLICY "Organization owners can insert members" 
ON public.organization_members 
FOR INSERT
WITH CHECK (
  -- ONLY check if user is organization owner - no recursion possible
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_members.organization_id 
    AND owner_id = auth.uid()
  )
);

-- Separate policy for existing members adding others (only applies to non-owners)
CREATE POLICY "Existing admins can add other members" 
ON public.organization_members 
FOR INSERT
WITH CHECK (
  -- Only for users who are NOT the organization owner
  NOT EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_members.organization_id 
    AND owner_id = auth.uid()
  )
  AND
  -- And they must be existing admin/owner members
  auth.uid() != organization_members.user_id 
  AND EXISTS (
    SELECT 1 FROM public.organization_members existing 
    WHERE existing.organization_id = organization_members.organization_id 
    AND existing.user_id = auth.uid() 
    AND existing.role IN ('owner', 'admin')
  )
);