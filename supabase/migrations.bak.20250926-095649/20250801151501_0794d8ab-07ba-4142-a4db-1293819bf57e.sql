-- Create a security definer function to get user's current organizational context
CREATE OR REPLACE FUNCTION public.get_user_organization_context(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  organization_id uuid,
  user_role text,
  organization_type text,
  can_upload boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Return organization context for the user with upload permissions
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    om.role as user_role,
    o.organization_type,
    (om.role IN ('admin', 'owner')) as can_upload
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = target_user_id
  ORDER BY 
    -- Prioritize primary organizations, then by role hierarchy
    CASE o.organization_type WHEN 'primary' THEN 1 ELSE 2 END,
    CASE om.role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'assessor' THEN 3 
      ELSE 4 
    END;
END;
$$;

-- Create a function to validate organization access for uploads
CREATE OR REPLACE FUNCTION public.user_can_upload_to_organization(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Check if user has upload permissions for the organization
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.organization_id = org_id 
      AND om.user_id = user_id
      AND om.role IN ('admin', 'owner')
  );
END;
$$;

-- Update RLS policies for ai_documents to use the new security functions
DROP POLICY IF EXISTS "Admins can insert documents" ON ai_documents;
CREATE POLICY "Admins can insert documents" 
ON ai_documents 
FOR INSERT 
WITH CHECK (
  user_can_upload_to_organization(organization_id, auth.uid())
);

DROP POLICY IF EXISTS "Admins can update documents" ON ai_documents;
CREATE POLICY "Admins can update documents" 
ON ai_documents 
FOR UPDATE 
USING (
  user_can_upload_to_organization(organization_id, auth.uid())
);

-- Update RLS policies for upload_session_log to enforce organizational boundaries
DROP POLICY IF EXISTS "Users can access their organization's upload sessions" ON upload_session_log;
CREATE POLICY "Users can access their organization's upload sessions" 
ON upload_session_log 
FOR ALL
USING (
  user_can_upload_to_organization(organization_id, auth.uid())
)
WITH CHECK (
  user_can_upload_to_organization(organization_id, auth.uid())
);

-- Create audit logging function for organizational context validation
CREATE OR REPLACE FUNCTION public.log_upload_context_validation(
  session_id_param text,
  organization_id_param uuid,
  user_id_param uuid,
  validation_result_param boolean,
  error_details_param text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason,
    field_name,
    new_value
  ) VALUES (
    organization_id_param,
    'upload_session_log',
    user_id_param,
    CASE WHEN validation_result_param THEN 'CONTEXT_VALIDATION_SUCCESS' ELSE 'CONTEXT_VALIDATION_FAILED' END,
    user_id_param,
    COALESCE(error_details_param, 'Organization context validation for upload session'),
    'session_id',
    session_id_param
  );
END;
$$;

-- Add index for better performance on organization context queries
CREATE INDEX IF NOT EXISTS idx_organization_members_user_org_role 
ON organization_members (user_id, organization_id, role);

-- Create a view for easier organization context access
CREATE OR REPLACE VIEW public.user_organization_access AS
SELECT 
  om.user_id,
  om.organization_id,
  om.role,
  o.name as organization_name,
  o.organization_type,
  (om.role IN ('admin', 'owner')) as can_upload,
  (om.role IN ('admin', 'owner', 'assessor')) as can_view_documents,
  o.linked_domains
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id;

-- Grant appropriate permissions
GRANT SELECT ON public.user_organization_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization_context(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_upload_to_organization(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_upload_context_validation(text, uuid, uuid, boolean, text) TO authenticated;