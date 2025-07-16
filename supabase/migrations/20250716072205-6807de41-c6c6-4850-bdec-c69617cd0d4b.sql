-- Remove the policy that's causing recursion
DROP POLICY "Existing admins can add other members" ON public.organization_members;

-- For now, only keep the owner policy which has no recursion risk
-- We can add back admin member policies later once organization creation works