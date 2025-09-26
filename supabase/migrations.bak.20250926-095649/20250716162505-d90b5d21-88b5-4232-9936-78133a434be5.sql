-- Drop and recreate the INSERT policy to ensure it works correctly
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Create a new INSERT policy that explicitly allows any authenticated user
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure RLS is enabled on the table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Verify the owner_id default is set correctly
ALTER TABLE public.organizations 
ALTER COLUMN owner_id SET DEFAULT auth.uid();