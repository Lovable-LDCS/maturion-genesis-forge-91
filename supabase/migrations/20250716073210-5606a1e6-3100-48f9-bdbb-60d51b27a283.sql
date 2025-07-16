-- Create a trigger to automatically set owner_id to current user on organization creation
CREATE OR REPLACE FUNCTION public.set_organization_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Set owner_id to current authenticated user if not already set
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger that fires before INSERT on organizations
CREATE TRIGGER set_organization_owner_trigger
  BEFORE INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_owner();