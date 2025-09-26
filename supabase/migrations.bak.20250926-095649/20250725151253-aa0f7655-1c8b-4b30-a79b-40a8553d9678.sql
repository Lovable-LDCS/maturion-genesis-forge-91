-- Fix remaining function search path issues
-- Let's address the remaining functions that need search_path settings

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_my_mps_documents()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_org_id uuid;
  result json;
BEGIN
  -- Get the user's organization ID
  SELECT organization_id INTO user_org_id
  FROM organization_members 
  WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  LIMIT 1;
  
  IF user_org_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No organization found or insufficient permissions'
    );
  END IF;
  
  -- Call the main reset function
  SELECT reset_mps_documents_for_reprocessing(user_org_id) INTO result;
  
  RETURN result;
END;
$function$;