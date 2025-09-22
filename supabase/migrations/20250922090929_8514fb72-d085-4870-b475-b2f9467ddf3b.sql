-- Phase 1: Add document context tracking fields
ALTER TABLE ai_documents 
ADD COLUMN context_level text DEFAULT 'organization' CHECK (context_level IN ('global', 'organization', 'subsidiary')),
ADD COLUMN target_organization_id uuid REFERENCES organizations(id);

-- Phase 2: Add organization hierarchy support
ALTER TABLE organizations 
ADD COLUMN parent_organization_id uuid REFERENCES organizations(id),
ADD COLUMN organization_level text DEFAULT 'parent' CHECK (organization_level IN ('backoffice', 'parent', 'subsidiary', 'department'));

-- Create index for efficient hierarchy queries
CREATE INDEX idx_organizations_parent ON organizations(parent_organization_id);
CREATE INDEX idx_ai_documents_context ON ai_documents(context_level, target_organization_id);

-- Update existing organizations to set appropriate levels
UPDATE organizations 
SET organization_level = 'backoffice' 
WHERE name ILIKE '%backoffice%' OR name ILIKE '%global%';

UPDATE organizations 
SET organization_level = 'parent' 
WHERE organization_level IS NULL OR organization_level = 'parent';

-- Function to get organization hierarchy with context
CREATE OR REPLACE FUNCTION get_organization_hierarchy(org_id uuid)
RETURNS TABLE(
    id uuid,
    name text,
    organization_level text,
    parent_organization_id uuid,
    depth integer
) 
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    WITH RECURSIVE org_hierarchy AS (
        -- Base case: start with the given organization
        SELECT 
            o.id,
            o.name,
            o.organization_level,
            o.parent_organization_id,
            0 as depth
        FROM organizations o
        WHERE o.id = org_id
        
        UNION ALL
        
        -- Recursive case: get children
        SELECT 
            o.id,
            o.name,
            o.organization_level,
            o.parent_organization_id,
            oh.depth + 1
        FROM organizations o
        INNER JOIN org_hierarchy oh ON o.parent_organization_id = oh.id
        WHERE oh.depth < 5 -- Prevent infinite recursion
    )
    SELECT * FROM org_hierarchy ORDER BY depth, name;
$$;

-- Function to check if user can access organization context
CREATE OR REPLACE FUNCTION user_can_access_organization_context(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        -- Direct membership
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = org_id AND om.user_id = user_id
    ) OR EXISTS (
        -- Parent organization access (can access subsidiaries)
        SELECT 1 FROM organization_members om
        JOIN organizations child ON child.parent_organization_id = om.organization_id
        WHERE child.id = org_id AND om.user_id = user_id AND om.role IN ('owner', 'admin')
    ) OR (
        -- Superuser access
        is_superuser(user_id)
    );
$$;

-- Update RLS policies for hierarchical access
CREATE POLICY "Users can access documents in their org hierarchy" 
ON ai_documents 
FOR SELECT 
USING (
    user_can_access_organization_context(organization_id) OR
    user_can_access_organization_context(target_organization_id)
);

-- Allow superusers to set global context
CREATE POLICY "Superusers can create global documents" 
ON ai_documents 
FOR INSERT 
WITH CHECK (
    is_superuser() OR 
    (context_level != 'global' AND user_can_upload_to_organization(organization_id, auth.uid()))
);