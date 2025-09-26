-- DROP AND RECREATE the policy with a safe fallback expression
DROP POLICY IF EXISTS allow_admin_override_insert ON public.admin_users;

CREATE POLICY allow_admin_override_insert
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    current_setting('request.jwt.claims', true)::json->>'email' IN (
      'johan.ras2@outlook.com',
      'your.colleague@email.com'  -- Update with real second email
    )
  )
);

-- Make sure these grants are in place
GRANT INSERT, SELECT ON public.admin_users TO authenticated;