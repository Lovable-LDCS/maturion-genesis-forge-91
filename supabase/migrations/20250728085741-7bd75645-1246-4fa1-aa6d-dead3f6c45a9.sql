-- Temporarily modify the audit trail function to handle null auth.uid()
CREATE OR REPLACE FUNCTION public.log_audit_trail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Insert audit record for UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_trail (
      organization_id, table_name, record_id, action, field_name, 
      old_value, new_value, changed_by, change_reason
    )
    SELECT 
      COALESCE(NEW.organization_id, OLD.organization_id),
      TG_TABLE_NAME,
      NEW.id,
      TG_OP,
      key,
      (to_jsonb(OLD)) ->> key,
      (to_jsonb(NEW)) ->> key,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000001'::uuid),
      'User update'
    FROM jsonb_each_text(to_jsonb(NEW)) 
    WHERE (to_jsonb(NEW)) ->> key IS DISTINCT FROM (to_jsonb(OLD)) ->> key
      AND key NOT IN ('updated_at', 'created_at');
      
    RETURN NEW;
  END IF;
  
  -- Insert audit record for INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_trail (
      organization_id, table_name, record_id, action, changed_by, change_reason
    ) VALUES (
      NEW.organization_id,
      TG_TABLE_NAME,
      NEW.id,
      TG_OP,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000001'::uuid),
      'User creation'
    );
    RETURN NEW;
  END IF;
  
  -- Insert audit record for DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_trail (
      organization_id, table_name, record_id, action, changed_by, change_reason
    ) VALUES (
      OLD.organization_id,
      TG_TABLE_NAME,
      OLD.id,
      TG_OP,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000001'::uuid),
      'User deletion'
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Now create the missing domains
INSERT INTO public.domains (
  name,
  display_order,
  organization_id,
  status,
  created_by,
  updated_by
) VALUES 
  ('Process Integrity', 2, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid),
  ('People & Culture', 3, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid),
  ('Protection', 4, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid),
  ('Proof it Works', 5, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid);