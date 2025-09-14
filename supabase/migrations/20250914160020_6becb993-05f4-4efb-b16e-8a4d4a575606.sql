-- Create private org_branding bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('org_branding', 'org_branding', false)
ON CONFLICT (id) DO NOTHING;

-- Add logo_object_path column to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS logo_object_path text;

-- Create secure helper function with safe search_path
CREATE OR REPLACE FUNCTION is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
  );
$$;

-- RLS policies for org_branding bucket

-- READ: org members can read their own branding
CREATE POLICY "org_branding_read_member"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'org_branding'
  AND (storage.foldername(name))[1] = 'org'
  AND is_org_member((storage.foldername(name))[2]::uuid)
);

-- INSERT: only org members can upload into their org folder with file type restrictions
CREATE POLICY "org_branding_insert_member"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'org_branding'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'org'
  AND is_org_member((storage.foldername(name))[2]::uuid)
  AND (storage.foldername(name))[3] = 'logo'
  AND lower(storage.extension(name)) IN ('png','jpg','jpeg','webp','svg')
);

-- UPDATE: only org members can update objects inside their org folder with hardening check
CREATE POLICY "org_branding_update_member"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'org_branding'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'org'
  AND is_org_member((storage.foldername(name))[2]::uuid)
)
WITH CHECK (
  bucket_id = 'org_branding'
  AND (storage.foldername(name))[1] = 'org'
  AND is_org_member((storage.foldername(name))[2]::uuid)
);

-- DELETE: only org members can delete their objects
CREATE POLICY "org_branding_delete_member"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'org_branding'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'org'
  AND is_org_member((storage.foldername(name))[2]::uuid)
);