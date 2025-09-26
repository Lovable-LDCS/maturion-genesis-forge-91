-- Disable all triggers on admin_users table temporarily
ALTER TABLE public.admin_users DISABLE TRIGGER ALL;

-- Insert the superuser as admin
INSERT INTO public.admin_users (user_id, role, email, granted_by)
VALUES (
  '1dfc1c68-022a-4b49-a86e-272a83bff8d3'::uuid,
  'admin',
  'johan.ras2@outlook.com',
  '1dfc1c68-022a-4b49-a86e-272a83bff8d3'::uuid
);

-- Log the manual admin grant in audit trail (bypassing triggers)
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
  'Superuser manually granted admin access - triggers bypassed'
);

-- Re-enable all triggers on admin_users table
ALTER TABLE public.admin_users ENABLE TRIGGER ALL;