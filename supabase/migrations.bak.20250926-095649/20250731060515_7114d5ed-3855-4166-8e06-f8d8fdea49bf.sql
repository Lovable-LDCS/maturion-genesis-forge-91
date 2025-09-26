-- Temporarily disable the admin security event trigger
DROP TRIGGER IF EXISTS log_admin_security_event_trigger ON public.admin_users;

-- Direct insert your admin user
INSERT INTO public.admin_users (user_id, email, role, granted_by)
VALUES ('1dfc1c68-022a-4b49-a86e-272a83bff8d3', 'johan.ras2@outlook.com', 'admin', '1dfc1c68-022a-4b49-a86e-272a83bff8d3')
ON CONFLICT (user_id) DO UPDATE SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  updated_at = now();

-- Re-enable the trigger
CREATE TRIGGER log_admin_security_event_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
FOR EACH ROW EXECUTE FUNCTION public.log_admin_security_event();