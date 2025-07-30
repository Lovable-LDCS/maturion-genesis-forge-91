-- Grant admin access to current user for policy change log visibility
INSERT INTO public.admin_users (user_id, email, role, granted_by, granted_at)
SELECT 
  auth.uid(),
  (SELECT email FROM auth.users WHERE id = auth.uid()),
  'admin',
  auth.uid(),
  now()
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  );