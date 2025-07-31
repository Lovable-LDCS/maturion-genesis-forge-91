-- Direct insert to bypass policy issues
INSERT INTO public.admin_users (user_id, email, role)
VALUES ('1dfc1c68-022a-4b49-a86e-272a83bff8d3', 'johan.ras2@outlook.com', 'admin')
ON CONFLICT (user_id) DO NOTHING;

-- Drop the problematic policy and create a more robust one
DROP POLICY IF EXISTS allow_admin_override_insert ON public.admin_users;

-- Create a simpler, more reliable policy that checks user_id directly
CREATE POLICY "allow_admin_insert_by_user_id" 
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND user_id = '1dfc1c68-022a-4b49-a86e-272a83bff8d3'::uuid
);