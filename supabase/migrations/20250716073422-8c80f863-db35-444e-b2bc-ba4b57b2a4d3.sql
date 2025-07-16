-- Drop the current strict INSERT policy
DROP POLICY "Users can create their own organizations" ON public.organizations;

-- Create a more flexible policy that allows NULL owner_id during insert
-- This lets the trigger set owner_id after RLS validation
CREATE POLICY "Users can create organizations" 
ON public.organizations 
FOR INSERT
WITH CHECK (
  auth.uid() = owner_id OR owner_id IS NULL
);

-- Also ensure our trigger function can access auth.uid() properly
-- Let's test the trigger function exists and is accessible
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'set_organization_owner';