-- Add audit columns to organizations table (allowing NULL initially)
ALTER TABLE public.organizations 
ADD COLUMN created_by UUID,
ADD COLUMN updated_by UUID;

-- Update existing records to set created_by and updated_by to owner_id
UPDATE public.organizations 
SET created_by = owner_id, updated_by = owner_id;

-- Now make the columns NOT NULL with proper defaults
ALTER TABLE public.organizations 
ALTER COLUMN created_by SET NOT NULL,
ALTER COLUMN created_by SET DEFAULT auth.uid(),
ALTER COLUMN updated_by SET NOT NULL,
ALTER COLUMN updated_by SET DEFAULT auth.uid();

-- Add trigger to automatically update updated_by and updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Set updated_by to current user on updates
CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_organizations_updated_by
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_by();