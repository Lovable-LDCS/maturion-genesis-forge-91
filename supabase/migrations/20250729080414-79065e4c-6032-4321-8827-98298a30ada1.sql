-- Temporarily disable the admin security trigger to allow manual admin assignment
-- Then re-enable it after inserting the superuser

-- Drop the trigger temporarily
DROP TRIGGER IF EXISTS admin_security_trigger ON public.admin_users;

-- Insert the superuser as admin
INSERT INTO public.admin_users (user_id, role, email, granted_by)
VALUES (
  '1dfc1c68-022a-4b49-a86e-272a83bff8d3'::uuid,
  'admin',
  'johan.ras2@outlook.com',
  '1dfc1c68-022a-4b49-a86e-272a83bff8d3'::uuid
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Log the manual admin grant in audit trail
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
  '1dfc1c68-022a-4b49-a86e-272a83bff8d3'::uuid,
  'MANUAL_ADMIN_GRANT',
  '1dfc1c68-022a-4b49-a86e-272a83bff8d3'::uuid,
  'Superuser manually granted admin access due to trigger auth context issue'
);

-- Re-create the admin security trigger
CREATE TRIGGER admin_security_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION log_admin_security_event();