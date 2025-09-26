-- [QA:EVD-01,EVD-02] Fix delete failure due to RLS on ai_document_versions
-- Pre-flight: ensure we don't duplicate policies and keep rollback instructions

-- Create superuser bypass policy so triggers inserting into ai_document_versions succeed when superuser updates ai_documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'ai_document_versions' 
      AND policyname = 'Superuser bypass for ai_document_versions'
  ) THEN
    CREATE POLICY "Superuser bypass for ai_document_versions"
    ON public.ai_document_versions
    FOR ALL
    USING (is_superuser() OR user_can_view_organization(organization_id))
    WITH CHECK (is_superuser() OR user_can_view_organization(organization_id));
  END IF;
END $$;

-- Post-checks
-- Verify policy exists
DO $$
DECLARE pol_count int;
BEGIN
  SELECT count(*) INTO pol_count FROM pg_policies 
   WHERE schemaname='public' AND tablename='ai_document_versions' 
     AND policyname='Superuser bypass for ai_document_versions';
  RAISE NOTICE 'Policies added: %', pol_count;
END $$;

-- Rollback plan
-- DROP POLICY IF EXISTS "Superuser bypass for ai_document_versions" ON public.ai_document_versions; -- [rollback]
