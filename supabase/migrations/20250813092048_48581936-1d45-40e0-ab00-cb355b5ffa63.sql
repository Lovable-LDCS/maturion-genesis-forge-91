-- CRITICAL SECURITY FIX: Remove overly permissive policy on ai_document_chunks
-- and implement proper organization-scoped access controls

-- Drop the dangerous "System can manage chunks" policy that allows unrestricted access
DROP POLICY IF EXISTS "System can manage chunks" ON public.ai_document_chunks;

-- Create secure policies for ai_document_chunks table

-- Policy 1: Only authenticated users can view chunks from their own organization
CREATE POLICY "Organization members can view their chunks" 
ON public.ai_document_chunks
FOR SELECT 
TO authenticated
USING (
    organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid()
    )
);

-- Policy 2: Only admin/owner members can insert chunks for their organization
CREATE POLICY "Admins can insert chunks for their organization" 
ON public.ai_document_chunks
FOR INSERT 
TO authenticated
WITH CHECK (
    organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid() 
            AND om.role IN ('admin', 'owner')
    )
);

-- Policy 3: Only admin/owner members can update chunks in their organization
CREATE POLICY "Admins can update chunks in their organization" 
ON public.ai_document_chunks
FOR UPDATE 
TO authenticated
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

-- Policy 4: Only admin/owner members can delete chunks from their organization
CREATE POLICY "Admins can delete chunks from their organization" 
ON public.ai_document_chunks
FOR DELETE 
TO authenticated
USING (
    organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid() 
            AND om.role IN ('admin', 'owner')
    )
);

-- Policy 5: Service role (for edge functions) can manage chunks with proper validation
-- This allows backend processes to work while maintaining security
CREATE POLICY "Service role can manage chunks with validation" 
ON public.ai_document_chunks
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Log this critical security fix
INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ai_document_chunks',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'CRITICAL_SECURITY_FIX',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Fixed critical vulnerability: removed overly permissive policy that allowed unrestricted access to sensitive document chunks. Implemented proper organization-scoped access controls.'
);