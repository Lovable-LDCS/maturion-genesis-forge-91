-- Fix circular dependency for document uploads during first-time setup
-- Drop existing restrictive policies that block initial setup
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents for their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents for their org" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view documents (public read)" ON storage.objects;

-- Create permissive policy for users to upload to their own UID folder during setup
CREATE POLICY "Users can upload documents to their own folder during setup"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ai-documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow upload to user's own UID folder for initial setup
    split_part(name, '/', 1) = auth.uid()::text
    OR
    -- Allow direct organization-id-filename format if user owns the organization
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE id::text = split_part(name, '-', 1) 
      AND owner_id = auth.uid()
    )
  )
);

-- Allow users to update their uploaded documents
CREATE POLICY "Users can update their own uploaded documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'ai-documents'
  AND auth.uid() IS NOT NULL
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE id::text = split_part(name, '-', 1) 
      AND owner_id = auth.uid()
    )
  )
);

-- Allow users to delete their uploaded documents
CREATE POLICY "Users can delete their own uploaded documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ai-documents'
  AND auth.uid() IS NOT NULL
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE id::text = split_part(name, '-', 1) 
      AND owner_id = auth.uid()
    )
  )
);

-- Allow viewing documents (bucket is private but we need controlled access)
CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ai-documents'
  AND auth.uid() IS NOT NULL
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE id::text = split_part(name, '-', 1) 
      AND owner_id = auth.uid()
    )
  )
);