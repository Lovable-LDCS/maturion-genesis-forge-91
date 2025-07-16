-- Check all policies on organization_members table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'organization_members' AND schemaname = 'public';