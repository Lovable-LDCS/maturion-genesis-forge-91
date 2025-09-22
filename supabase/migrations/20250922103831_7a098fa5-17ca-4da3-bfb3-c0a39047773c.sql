-- [QA:EVD-01,CRIT-02] Fix RLS violations on ai_document_versions for superusers and cascading operations
-- Safe policy replacement with pre-flight checks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'ai_document_versions' 
      AND policyname = 'Superuser bypass for ai_document_versions'
  ) THEN
    EXECUTE 'DROP POLICY "Superuser bypass for ai_document_versions" ON public.ai_document_versions';
  END IF;
END $$;

-- Create permissive superuser bypass that works for SELECT/INSERT/UPDATE/DELETE
-- Note: For INSERT, WITH CHECK is evaluated; for SELECT/UPDATE/DELETE, USING is evaluated
CREATE POLICY "Superuser bypass for ai_document_versions"
ON public.ai_document_versions
FOR ALL
USING (
  is_superuser() OR user_can_view_organization(organization_id)
)
WITH CHECK (
  is_superuser() OR user_can_upload_to_organization(organization_id, auth.uid())
);

-- Post-check evidence (visible in migration logs)
DO $$
DECLARE p record;
BEGIN
  FOR p IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies 
    WHERE schemaname='public' AND tablename='ai_document_versions'
  LOOP
    RAISE NOTICE '[RLS] % cmd=% roles=%', p.policyname, p.cmd, p.roles;
    RAISE NOTICE 'QUAL=%', p.qual;
    RAISE NOTICE 'WITH_CHECK=%', p.with_check;
  END LOOP;
END $$;