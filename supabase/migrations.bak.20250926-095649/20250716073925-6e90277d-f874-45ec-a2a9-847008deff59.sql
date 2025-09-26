-- Drop the current INSERT policy
DROP POLICY "Anyone can insert organizations" ON public.organizations;

-- Check what other policies exist first
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'organizations';