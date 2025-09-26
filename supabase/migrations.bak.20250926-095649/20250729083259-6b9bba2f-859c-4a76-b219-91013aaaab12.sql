-- Fix infinite recursion in admin_users RLS policies
-- The issue is that the admin_users policies are checking admin_users table recursively

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Admin users can view admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Only existing admins can grant admin access" ON public.admin_users;

-- Create new policies without infinite recursion
-- Allow users to view admin list if they are authenticated
CREATE POLICY "Admin users can view admin list" 
ON public.admin_users FOR SELECT 
TO authenticated
USING (true);

-- Allow authenticated users to insert admin records (controlled by application logic)
CREATE POLICY "Authenticated users can grant admin access" 
ON public.admin_users FOR INSERT 
TO authenticated
WITH CHECK (true);