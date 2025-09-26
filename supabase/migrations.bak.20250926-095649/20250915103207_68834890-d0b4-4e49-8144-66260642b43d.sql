-- Drop unsafe public policy (if present)
DROP POLICY IF EXISTS "Admins can view AI documents" ON storage.objects;

-- Allow org members to read only their own objects (ai_documents)
CREATE POLICY "Org members can read ai_documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ai_documents'
    AND EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND name LIKE 'org/' || om.organization_id::text || '/%'
    )
  );

-- Allow org members to read documents bucket
CREATE POLICY "Org members can read documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND name LIKE 'org/' || om.organization_id::text || '/%'
    )
  );

-- Ensure service_role can read regardless of org (needed for edge functions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='svc can read any object'
  ) THEN
    CREATE POLICY "svc can read any object"
      ON storage.objects
      FOR SELECT
      TO service_role
      USING (true);
  END IF;
END $$;