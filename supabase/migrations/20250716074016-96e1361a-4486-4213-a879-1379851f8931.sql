-- Drop ALL existing policies on organizations
DROP POLICY "Organization owners can delete their organizations" ON public.organizations;
DROP POLICY "Organization owners can update their organizations" ON public.organizations;
DROP POLICY "Users can create organizations" ON public.organizations;
DROP POLICY "Users can view organizations they are members of" ON public.organizations;

-- Create INSERT policy that allows anyone (trigger handles ownership)
CREATE POLICY "Anyone can insert organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (true);

-- Create unified policy for SELECT/UPDATE/DELETE that enforces ownership
CREATE POLICY "Owner can access own organization"
  ON public.organizations
  FOR SELECT, UPDATE, DELETE
  USING (auth.uid() = owner_id);