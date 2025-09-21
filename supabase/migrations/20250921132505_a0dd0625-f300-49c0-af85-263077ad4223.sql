-- Rollback conflicting ai_documents policies and replace with safe, side‑effect‑free RLS
-- [QA:EVD-01]

-- 1) INSERT policy (remove function calls with side effects)
DROP POLICY IF EXISTS "Authorized users can insert documents" ON public.ai_documents;
CREATE POLICY "Org admins/owners can insert documents" 
ON public.ai_documents
FOR INSERT
TO authenticated
WITH CHECK (
  is_superuser() OR
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = ai_documents.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin','owner')
  )
);

-- 2) UPDATE policy (align with same principle)
DROP POLICY IF EXISTS "Authorized users can update documents" ON public.ai_documents;
CREATE POLICY "Org admins/owners can update documents" 
ON public.ai_documents
FOR UPDATE
TO authenticated
USING (
  is_superuser() OR
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = ai_documents.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin','owner')
  )
);

-- 3) Ensure SELECT policy exists for organization members (kept as-is but add duplicate-safe definition)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_documents' AND policyname='Users can view documents from their organization'
  ) THEN
    CREATE POLICY "Users can view documents from their organization"
    ON public.ai_documents
    FOR SELECT
    TO authenticated
    USING (
      organization_id IN (
        SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 4) Optional: allow DELETE for admins/owners if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_documents' AND policyname='Admins can delete documents'
  ) THEN
    CREATE POLICY "Admins can delete documents"
    ON public.ai_documents
    FOR DELETE
    TO authenticated
    USING (
      organization_id IN (
        SELECT om.organization_id FROM public.organization_members om 
        WHERE om.user_id = auth.uid() AND om.role IN ('admin','owner')
      )
    );
  END IF;
END $$;

-- 5) Audit marker
INSERT INTO public.audit_trail (
  organization_id, table_name, record_id, action, changed_by, change_reason
) VALUES (
  '00000000-0000-0000-0000-000000000000', 'ai_documents', '00000000-0000-0000-0000-000000000000',
  'RLS_POLICIES_UPDATED', '00000000-0000-0000-0000-000000000001',
  'Removed side-effect function in RLS; restricted to authenticated admins/owners to fix 403 on insert'
);