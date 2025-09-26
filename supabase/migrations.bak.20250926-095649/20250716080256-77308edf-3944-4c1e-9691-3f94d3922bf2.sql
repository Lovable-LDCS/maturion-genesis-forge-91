-- Check if the SELECT policy exists on organization_members
\d+ organization_members

-- Also check all policies on organization_members table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'organization_members';