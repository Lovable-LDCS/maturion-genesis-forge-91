-- Check current policies on organization_members
SELECT policyname, cmd, roles, with_check, qual 
FROM pg_policies 
WHERE tablename = 'organization_members';