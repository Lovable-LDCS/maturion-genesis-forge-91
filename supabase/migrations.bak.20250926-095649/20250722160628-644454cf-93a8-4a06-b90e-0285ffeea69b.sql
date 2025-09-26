-- Check and create proper RLS policies for organization logo uploads

-- First, let's see what storage policies currently exist
-- Note: We need to create policies that allow users to upload logos to their own organization

-- Create policy for organization logo uploads
-- Users can upload logos to their own organization
CREATE POLICY "Users can upload logos to their organization" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow if the filename starts with an organization ID that the user owns
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE id::text = split_part(name, '-logo.', 1) 
      AND owner_id = auth.uid()
    )
    OR
    -- Allow if the user is a member of the organization (for folder structure)
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE o.id::text = split_part(name, '-logo.', 1)
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  )
);

-- Create policy for users to update/replace their organization logos
CREATE POLICY "Users can update logos for their organization" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE id::text = split_part(name, '-logo.', 1) 
      AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE o.id::text = split_part(name, '-logo.', 1)
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  )
);

-- Create policy for users to delete their organization logos
CREATE POLICY "Users can delete logos for their organization" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE id::text = split_part(name, '-logo.', 1) 
      AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE o.id::text = split_part(name, '-logo.', 1)
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  )
);

-- Create policy for viewing organization logos (since bucket is public, this should be permissive)
CREATE POLICY "Anyone can view organization logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'organization-logos');