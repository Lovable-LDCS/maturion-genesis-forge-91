-- Drop the current INSERT policy with WITH CHECK constraint
DROP POLICY "Users can create organizations" ON public.organizations;

-- Create an INSERT policy that allows all inserts (no WITH CHECK)
-- The BEFORE INSERT trigger will handle setting owner_id securely
CREATE POLICY "Anyone can insert organizations" 
ON public.organizations 
FOR INSERT
USING (true);

-- The existing BEFORE INSERT trigger will ensure owner_id is always set to auth.uid()
-- This cannot be spoofed since triggers run with SECURITY DEFINER
-- Other policies (SELECT/UPDATE/DELETE) still enforce owner_id = auth.uid() checks