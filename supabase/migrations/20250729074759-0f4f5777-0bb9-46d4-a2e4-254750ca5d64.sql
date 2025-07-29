-- Grant admin access to the superuser
-- This adds the current authenticated user to the admin_users table
-- The user must be signed in when this migration runs

-- First, let's create a function to add the current user as admin
CREATE OR REPLACE FUNCTION grant_current_user_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found. Please sign in first.';
  END IF;
  
  -- Get user email for logging
  SELECT email INTO current_user_email 
  FROM auth.users 
  WHERE id = current_user_id;
  
  -- Insert the user as admin if not already present
  INSERT INTO public.admin_users (user_id, role, email, granted_by)
  VALUES (
    current_user_id, 
    'admin', 
    current_user_email,
    current_user_id  -- Self-granted for initial setup
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the action
  INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'admin_users',
    current_user_id,
    'ADMIN_GRANTED',
    current_user_id,
    'Superuser granted admin access via migration'
  );
  
  RAISE NOTICE 'Admin access granted to user: % (ID: %)', current_user_email, current_user_id;
END;
$$;

-- Execute the function to grant admin access
SELECT grant_current_user_admin();

-- Clean up the temporary function
DROP FUNCTION grant_current_user_admin();