-- Create or update superuser access function
CREATE OR REPLACE FUNCTION public.is_superuser(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.backoffice_admins ba
    WHERE ba.user_id = user_id_param
  ) OR EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = user_id_param
  );
$$;

-- Update RLS policies for ai_documents to include superuser bypass
DROP POLICY IF EXISTS "Superuser bypass for ai_documents" ON public.ai_documents;
CREATE POLICY "Superuser bypass for ai_documents"
ON public.ai_documents
FOR ALL
TO authenticated
USING (
  public.is_superuser() OR 
  user_can_view_organization(organization_id)
)
WITH CHECK (
  public.is_superuser() OR 
  user_can_upload_to_organization(organization_id, auth.uid())
);

-- Update RLS policies for ai_document_chunks to include superuser bypass
DROP POLICY IF EXISTS "Superuser bypass for ai_document_chunks" ON public.ai_document_chunks;
CREATE POLICY "Superuser bypass for ai_document_chunks"
ON public.ai_document_chunks
FOR ALL
TO authenticated
USING (
  public.is_superuser() OR 
  user_can_view_organization(organization_id)
)
WITH CHECK (
  public.is_superuser() OR 
  user_can_upload_to_organization(organization_id, auth.uid())
);

-- Update other key tables with superuser bypass
DROP POLICY IF EXISTS "Superuser bypass for organizations" ON public.organizations;
CREATE POLICY "Superuser bypass for organizations"
ON public.organizations
FOR ALL
TO authenticated
USING (
  public.is_superuser() OR 
  user_can_view_organization(id)
)
WITH CHECK (
  public.is_superuser() OR 
  user_can_view_organization(id)
);

-- Add superuser bypass to assessment-related tables
DROP POLICY IF EXISTS "Superuser bypass for assessments" ON public.assessments;
CREATE POLICY "Superuser bypass for assessments"
ON public.assessments
FOR ALL
TO authenticated
USING (
  public.is_superuser() OR 
  user_can_view_organization(organization_id)
)
WITH CHECK (
  public.is_superuser() OR 
  user_can_view_organization(organization_id)
);

DROP POLICY IF EXISTS "Superuser bypass for criteria" ON public.criteria;
CREATE POLICY "Superuser bypass for criteria"
ON public.criteria
FOR ALL
TO authenticated
USING (
  public.is_superuser() OR 
  user_can_view_organization(organization_id)
)
WITH CHECK (
  public.is_superuser() OR 
  user_can_view_organization(organization_id)
);

DROP POLICY IF EXISTS "Superuser bypass for domains" ON public.domains;
CREATE POLICY "Superuser bypass for domains"
ON public.domains
FOR ALL
TO authenticated
USING (
  public.is_superuser() OR 
  user_can_view_organization(organization_id)
)
WITH CHECK (
  public.is_superuser() OR 
  user_can_view_organization(organization_id)
);