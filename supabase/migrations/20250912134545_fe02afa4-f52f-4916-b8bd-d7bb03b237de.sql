-- Organization Onboarding Pipeline Fixes
-- Creates storage bucket for logos and improves document processing

-- Create organization logos storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('organization-logos', 'organization-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for organization logo uploads
CREATE POLICY "Users can upload logos to their own organization folder" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'organization-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Organization logos are publicly viewable" ON storage.objects
FOR SELECT 
USING (bucket_id = 'organization-logos');

CREATE POLICY "Users can update their own organization logos" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own organization logos" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add logo_url column to organizations table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'logo_url'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN logo_url text;
  END IF;
END $$;