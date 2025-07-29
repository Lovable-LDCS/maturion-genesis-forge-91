-- Update existing organizations to mark the one with data as primary (if not already done)
UPDATE public.organizations 
SET organization_type = 'primary' 
WHERE id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d' AND organization_type != 'primary';

-- Mark others as linked (if not already done)
UPDATE public.organizations 
SET organization_type = 'linked' 
WHERE id != '2f122a62-ca59-4c8e-adf6-796aa7011c5d' AND organization_type != 'linked';

-- Create constraint to ensure only one primary org per user/owner (if it doesn't exist)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_org_per_owner 
ON public.organizations (owner_id) 
WHERE organization_type = 'primary';