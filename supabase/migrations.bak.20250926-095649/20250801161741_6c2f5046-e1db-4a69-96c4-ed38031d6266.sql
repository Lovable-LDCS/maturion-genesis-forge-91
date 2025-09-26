-- Set up APGI platform owner account
-- 1. Add APGI user as backoffice admin
INSERT INTO public.backoffice_admins (user_id, email, granted_by)
VALUES (
  'dc7609db-1323-478a-8739-775f0020cac2',
  'johan.ras@apginc.ca',
  'dc7609db-1323-478a-8739-775f0020cac2'
) ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  granted_at = now();

-- 2. Create APGI organization as primary
INSERT INTO public.organizations (
  id,
  name, 
  description,
  organization_type,
  owner_id,
  created_by,
  updated_by
) VALUES (
  gen_random_uuid(),
  'APGI',
  'Advanced Platform Group Inc. - Primary Organization',
  'primary',
  'dc7609db-1323-478a-8739-775f0020cac2',
  'dc7609db-1323-478a-8739-775f0020cac2',
  'dc7609db-1323-478a-8739-775f0020cac2'
) ON CONFLICT DO NOTHING;

-- 3. Add user as admin to existing admin_users table
INSERT INTO public.admin_users (user_id, email, role, granted_by)
VALUES (
  'dc7609db-1323-478a-8739-775f0020cac2',
  'johan.ras@apginc.ca',
  'admin',
  'dc7609db-1323-478a-8739-775f0020cac2'
) ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  granted_at = now();

-- 4. Log the setup for audit trail
INSERT INTO public.audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  changed_by,
  change_reason
) VALUES (
  (SELECT id FROM organizations WHERE name = 'APGI' AND owner_id = 'dc7609db-1323-478a-8739-775f0020cac2' LIMIT 1),
  'platform_setup',
  'dc7609db-1323-478a-8739-775f0020cac2',
  'PLATFORM_OWNER_SETUP',
  'dc7609db-1323-478a-8739-775f0020cac2',
  'APGI platform owner account setup with full admin and backoffice permissions'
);