-- Cleanup: Drop existing policies to prevent duplicates
DROP POLICY IF EXISTS "org_branding_read_member" ON storage.objects;
DROP POLICY IF EXISTS "org_branding_insert_member" ON storage.objects;
DROP POLICY IF EXISTS "org_branding_update_member" ON storage.objects;
DROP POLICY IF EXISTS "org_branding_delete_member" ON storage.objects;

-- Recreate RLS policies with proper cleanup
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