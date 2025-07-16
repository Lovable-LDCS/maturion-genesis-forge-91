-- Fix the organization creation issue by updating the trigger function
-- to use SECURITY DEFINER and ensuring it works with RLS

CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Use SECURITY DEFINER context to bypass RLS for the trigger operation
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also ensure the INSERT policy on organizations is correct
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);