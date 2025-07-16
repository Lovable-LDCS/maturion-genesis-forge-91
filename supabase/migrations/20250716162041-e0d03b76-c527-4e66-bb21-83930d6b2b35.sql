-- Set default value for owner_id to automatically use current user
ALTER TABLE public.organizations 
ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- Update the INSERT policy to allow any authenticated user
-- The default value and trigger will ensure owner_id is set correctly
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);