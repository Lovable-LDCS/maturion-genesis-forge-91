-- Ensure the admin_users table allows inserts by the authenticated user
-- This assumes RLS is enabled and insert is currently blocked

-- Step 1: Confirm RLS is enabled
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Step 2: Create a policy to allow insert if the user is authenticated and matches the override
CREATE POLICY allow_admin_override_insert
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  email = 'johan.ras2@outlook.com' OR email = 'your.colleague@email.com'
);

-- Step 3: Grant permissions if not yet granted
GRANT INSERT, SELECT ON public.admin_users TO authenticated;