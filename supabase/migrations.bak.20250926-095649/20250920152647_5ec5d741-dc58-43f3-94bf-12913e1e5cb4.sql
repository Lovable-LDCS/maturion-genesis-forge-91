-- Create storage bucket for evidence submissions
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence', 'evidence', false);

-- Create storage policies for evidence bucket
CREATE POLICY "Users can view evidence from their organization"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'evidence' AND 
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload evidence to their organization folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'evidence' AND 
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update evidence in their organization folder"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'evidence' AND 
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Superusers can manage all evidence"
ON storage.objects
FOR ALL
USING (bucket_id = 'evidence' AND is_superuser());