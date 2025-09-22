-- [QA:EVD-01,EVD-02] Fix RLS policy for ai_document_versions to allow proper deletion
-- Issue: Document deletion triggers create versions but RLS blocks inserts, causing deletion failures

-- Drop and recreate policy to avoid conflicts
DROP POLICY IF EXISTS "Service role can insert versions for triggers" ON public.ai_document_versions;

-- Add service role bypass for document versioning triggers  
CREATE POLICY "Service role can insert versions for triggers"
ON public.ai_document_versions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Grant service role access to ai_document_versions for trigger operations
GRANT ALL ON public.ai_document_versions TO service_role;

-- Verify the policy exists
SELECT COUNT(*) as policy_count FROM pg_policies 
WHERE tablename = 'ai_document_versions' 
AND policyname = 'Service role can insert versions for triggers';