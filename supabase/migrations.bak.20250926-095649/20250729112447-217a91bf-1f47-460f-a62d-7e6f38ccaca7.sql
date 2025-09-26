-- Add organization_type to distinguish primary vs linked organizations
ALTER TABLE public.organizations 
ADD COLUMN organization_type TEXT DEFAULT 'primary' CHECK (organization_type IN ('primary', 'linked'));

-- Update existing organizations to mark the one with data as primary
UPDATE public.organizations 
SET organization_type = 'primary' 
WHERE id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d';

-- Mark others as linked
UPDATE public.organizations 
SET organization_type = 'linked' 
WHERE id != '2f122a62-ca59-4c8e-adf6-796aa7011c5d';

-- Add constraint to ensure only one primary org per user/owner
CREATE UNIQUE INDEX idx_one_primary_org_per_owner 
ON public.organizations (owner_id) 
WHERE organization_type = 'primary';

-- Create function to get user's primary organization
CREATE OR REPLACE FUNCTION public.get_user_primary_organization(user_uuid uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT o.id
  FROM public.organizations o
  LEFT JOIN public.organization_members om ON om.organization_id = o.id
  WHERE (o.owner_id = user_uuid OR om.user_id = user_uuid)
    AND o.organization_type = 'primary'
  LIMIT 1;
$$;

-- Create function to validate organization is primary
CREATE OR REPLACE FUNCTION public.is_primary_organization(org_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = org_uuid AND organization_type = 'primary'
  );
$$;