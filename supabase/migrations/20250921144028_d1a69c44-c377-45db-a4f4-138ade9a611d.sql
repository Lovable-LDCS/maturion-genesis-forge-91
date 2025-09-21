-- SECURITY FIX: Phase 1 - Critical Data Protection
-- Remove public access from sensitive tables and secure demo policies

-- 1. Secure security_exceptions table - restrict to organization members only
DROP POLICY IF EXISTS "Enable read access for all users" ON public.security_exceptions;

CREATE POLICY "Organization members can view security exceptions"
ON public.security_exceptions
FOR SELECT 
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can manage security exceptions"
ON public.security_exceptions
FOR ALL
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid() 
      AND om.role IN ('admin', 'owner')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid() 
      AND om.role IN ('admin', 'owner')
  )
);

-- 2. Secure subscription_modules table - admin access only
DROP POLICY IF EXISTS "Enable read access for all users" ON public.subscription_modules;

CREATE POLICY "Admin users can manage subscription modules"
ON public.subscription_modules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() 
      AND om.role IN ('admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() 
      AND om.role IN ('admin', 'owner')
  )
);

-- 3. Secure external_insights table - organization scoped access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.external_insights;

CREATE POLICY "Organization members can view external insights"
ON public.external_insights
FOR SELECT
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can manage external insights"
ON public.external_insights
FOR ALL
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid() 
      AND om.role IN ('admin', 'owner')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid() 
      AND om.role IN ('admin', 'owner')
  )
);

-- 4. Enhance demo access security - add proper content filtering
DROP POLICY IF EXISTS "Secure demo read for ai_documents" ON public.ai_documents;
DROP POLICY IF EXISTS "Secure demo read for ai_document_chunks" ON public.ai_document_chunks;

-- More restrictive demo policy for documents - require explicit demo flag and content review
CREATE POLICY "Secure demo read for ai_documents"
ON public.ai_documents
FOR SELECT
USING (
  (metadata->>'demo_accessible')::boolean = true 
  AND processing_status = 'completed'
  AND total_chunks > 0
  AND (metadata->>'demo_reviewed')::boolean = true  -- Require manual review
  AND NOT (metadata->>'contains_sensitive_data')::boolean  -- Explicit no sensitive data flag
);

-- More restrictive demo policy for chunks - additional content filtering
CREATE POLICY "Secure demo read for ai_document_chunks" 
ON public.ai_document_chunks
FOR SELECT
USING (
  document_id IN (
    SELECT id FROM ai_documents 
    WHERE (metadata->>'demo_accessible')::boolean = true 
      AND processing_status = 'completed'
      AND (metadata->>'demo_reviewed')::boolean = true
      AND NOT (metadata->>'contains_sensitive_data')::boolean
  )
  AND length(content) < 200  -- Keep length restriction
  AND NOT (metadata->>'contains_pii')::boolean  -- No PII in chunks
  AND (metadata->>'demo_approved')::boolean = true  -- Explicit chunk approval
);

-- Log the security remediation
INSERT INTO audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  changed_by,
  change_reason
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'security_remediation',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'PHASE_1_SECURITY_FIXES_APPLIED',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Applied critical data protection fixes: secured sensitive tables (security_exceptions, subscription_modules, external_insights) and enhanced demo access controls'
);