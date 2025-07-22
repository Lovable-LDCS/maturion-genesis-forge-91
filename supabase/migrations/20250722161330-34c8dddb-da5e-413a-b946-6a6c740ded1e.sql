-- Fix circular dependency for logo uploads during first-time setup
-- Drop existing restrictive policies that block initial setup
DROP POLICY IF EXISTS "Users can upload logos to their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can update logos for their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete logos for their organization" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view organization logos" ON storage.objects;

-- Create permissive policy for users to upload to their own UID folder during setup
CREATE POLICY "Users can upload to their own folder during setup" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow upload to user's own UID folder for initial setup
    split_part(name, '/', 1) = auth.uid()::text
    OR
    -- Allow direct organization-id-logo.png format if user owns the organization
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE id::text = split_part(name, '-logo.', 1) 
      AND owner_id = auth.uid()
    )
  )
);

-- Allow users to update their uploaded logos
CREATE POLICY "Users can update their own logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE id::text = split_part(name, '-logo.', 1) 
      AND owner_id = auth.uid()
    )
  )
);

-- Allow users to delete their uploaded logos
CREATE POLICY "Users can delete their own logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE id::text = split_part(name, '-logo.', 1) 
      AND owner_id = auth.uid()
    )
  )
);

-- Allow viewing all organization logos (bucket is public)
CREATE POLICY "Anyone can view organization logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'organization-logos');