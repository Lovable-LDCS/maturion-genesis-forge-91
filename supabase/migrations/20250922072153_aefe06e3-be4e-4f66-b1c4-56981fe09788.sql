-- Fix RLS policy for ai_document_versions to allow proper deletion
-- The current policy has no condition (qual is null) which blocks proper access

-- Drop and recreate the admin policy with proper conditions
DROP POLICY IF EXISTS "Admins can create versions" ON ai_document_versions;

CREATE POLICY "Admins can create versions" 
ON ai_document_versions 
FOR INSERT 
TO public
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid() 
    AND om.role IN ('admin', 'owner')
  )
);

-- Also allow admins to update versions if needed
CREATE POLICY "Admins can update versions" 
ON ai_document_versions 
FOR UPDATE 
TO public
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid() 
    AND om.role IN ('admin', 'owner')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid() 
    AND om.role IN ('admin', 'owner')
  )
);

-- Allow admins to delete versions
CREATE POLICY "Admins can delete versions" 
ON ai_document_versions 
FOR DELETE 
TO public
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid() 
    AND om.role IN ('admin', 'owner')
  )
);