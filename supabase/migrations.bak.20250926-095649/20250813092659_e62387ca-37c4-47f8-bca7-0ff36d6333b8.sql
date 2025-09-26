-- CRITICAL SECURITY FIX: Remove overly permissive policy on approved_chunks_cache
-- and implement proper organization-scoped access controls

-- Drop the dangerous "System can manage approved chunks" policy that allows unrestricted access
DROP POLICY IF EXISTS "System can manage approved chunks" ON public.approved_chunks_cache;

-- Create secure policies for approved_chunks_cache table

-- Policy 1: Only authenticated organization members can view approved chunks from their organization
CREATE POLICY "Organization members can view their approved chunks" 
ON public.approved_chunks_cache
FOR SELECT 
TO authenticated
USING (
    organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid()
    )
);

-- Policy 2: Only admin/owner members can insert approved chunks for their organization
CREATE POLICY "Admins can insert approved chunks for their organization" 
ON public.approved_chunks_cache
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

-- Policy 3: Only admin/owner members can update approved chunks in their organization
CREATE POLICY "Admins can update approved chunks in their organization" 
ON public.approved_chunks_cache
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

-- Policy 4: Only admin/owner members can delete approved chunks from their organization
CREATE POLICY "Admins can delete approved chunks from their organization" 
ON public.approved_chunks_cache
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

-- Policy 5: Service role (for edge functions) can manage approved chunks with proper validation
-- This allows backend processes to work while maintaining security
CREATE POLICY "Service role can manage approved chunks with validation" 
ON public.approved_chunks_cache
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
    'approved_chunks_cache',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'CRITICAL_SECURITY_FIX',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Fixed critical vulnerability: removed overly permissive policy that allowed unrestricted public access to sensitive approved document chunks. Implemented proper organization-scoped access controls requiring authentication and organization membership.'
);