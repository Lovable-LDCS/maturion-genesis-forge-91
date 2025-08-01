-- Create storage bucket for unified document uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-documents', 'ai-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create comprehensive storage policies for the ai-documents bucket
-- Allow admins/owners to insert files
CREATE POLICY "Admin users can upload ai documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'ai-documents' 
  AND auth.uid() IN (
    SELECT om.user_id 
    FROM organization_members om 
    WHERE om.role IN ('admin', 'owner')
  )
);

-- Allow admins/owners to view files from their organization
CREATE POLICY "Admin users can view their organization ai documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'ai-documents' 
  AND auth.uid() IN (
    SELECT om.user_id 
    FROM organization_members om 
    WHERE om.role IN ('admin', 'owner')
    AND om.organization_id::text = (storage.foldername(name))[1]
  )
);

-- Allow admins/owners to update files from their organization
CREATE POLICY "Admin users can update their organization ai documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'ai-documents' 
  AND auth.uid() IN (
    SELECT om.user_id 
    FROM organization_members om 
    WHERE om.role IN ('admin', 'owner')
    AND om.organization_id::text = (storage.foldername(name))[1]
  )
);

-- Allow admins/owners to delete files from their organization  
CREATE POLICY "Admin users can delete their organization ai documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'ai-documents' 
  AND auth.uid() IN (
    SELECT om.user_id 
    FROM organization_members om 
    WHERE om.role IN ('admin', 'owner')
    AND om.organization_id::text = (storage.foldername(name))[1]
  )
);