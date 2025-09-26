-- Create INSERT policy that allows anyone (trigger handles ownership)
CREATE POLICY "Anyone can insert organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (true);

-- Create SELECT policy that enforces ownership
CREATE POLICY "Owner can select own organization"
  ON public.organizations
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Create UPDATE policy that enforces ownership
CREATE POLICY "Owner can update own organization"
  ON public.organizations
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Create DELETE policy that enforces ownership
CREATE POLICY "Owner can delete own organization"
  ON public.organizations
  FOR DELETE
  USING (auth.uid() = owner_id);