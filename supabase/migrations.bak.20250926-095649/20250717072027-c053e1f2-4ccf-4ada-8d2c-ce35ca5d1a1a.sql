-- Create bucket for organization logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('organization-logos', 'organization-logos', true);

-- Upload policy - users can upload logos to their own folder
CREATE POLICY "Organization members can upload logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'organization-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Read policy - logos are publicly accessible
CREATE POLICY "Organization logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'organization-logos');

-- Update policy - users can update their own logos
CREATE POLICY "Organization members can update their logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'organization-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Delete policy - users can delete their own logos
CREATE POLICY "Organization members can delete their logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'organization-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add logo_url column to organizations table
ALTER TABLE organizations ADD COLUMN logo_url TEXT;