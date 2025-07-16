-- 1️⃣ Fix AFTER INSERT trigger that updates owner_id after insert
DROP TRIGGER IF EXISTS set_organization_owner_trigger ON public.organizations;
DROP FUNCTION IF EXISTS public.set_organization_owner;

CREATE OR REPLACE FUNCTION public.set_owner_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.organizations
  SET owner_id = auth.uid()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_owner_after_insert_trigger
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_owner_after_insert();

-- 2️⃣ Allow inserts from anyone (owner_id will be fixed in trigger)
DROP POLICY IF EXISTS "Anyone can insert organizations" ON public.organizations;

CREATE POLICY "Anyone can insert organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (true);

-- 3️⃣ Enforce SELECT only for owners
DROP POLICY IF EXISTS "Owner can select own organization" ON public.organizations;

CREATE POLICY "Owner can select own organization"
  ON public.organizations
  FOR SELECT
  USING (auth.uid() = owner_id);