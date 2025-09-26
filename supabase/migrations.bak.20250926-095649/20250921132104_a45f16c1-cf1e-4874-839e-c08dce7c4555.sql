-- Fix ai_documents RLS policies for proper upload permissions
-- This addresses the "permission denied for table ai_documents" error

-- Drop existing problematic INSERT policy
DROP POLICY IF EXISTS "Admins can insert documents" ON public.ai_documents;

-- Create a comprehensive INSERT policy that covers all authorized users
CREATE POLICY "Authorized users can insert documents" 
ON public.ai_documents 
FOR INSERT 
TO authenticated, anon
WITH CHECK (
  -- Allow if user is a superuser/backoffice admin
  is_superuser(auth.uid()) OR
  -- Allow if user is an admin/owner of the organization
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = ai_documents.organization_id 
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
  ) OR
  -- Allow if user has explicit upload permission
  user_can_upload_to_organization(ai_documents.organization_id, auth.uid())
);

-- Also ensure UPDATE policy is consistent
DROP POLICY IF EXISTS "Admins can update documents" ON public.ai_documents;

CREATE POLICY "Authorized users can update documents" 
ON public.ai_documents 
FOR UPDATE 
TO authenticated, anon
USING (
  -- Allow if user is a superuser/backoffice admin
  is_superuser(auth.uid()) OR
  -- Allow if user is an admin/owner of the organization
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = ai_documents.organization_id 
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
  ) OR
  -- Allow if user has explicit upload permission
  user_can_upload_to_organization(ai_documents.organization_id, auth.uid())
);

-- Log this fix for audit purposes
INSERT INTO public.audit_trail (
  organization_id,
  table_name,
  record_id,
  action,
  changed_by,
  change_reason
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'ai_documents_rls_policies',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'POLICY_FIX_APPLIED',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Fixed RLS policies to resolve document upload permission denied errors'
);