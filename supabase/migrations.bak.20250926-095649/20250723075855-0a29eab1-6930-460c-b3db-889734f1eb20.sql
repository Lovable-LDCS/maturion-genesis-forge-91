-- Fix the audit trail function that's causing the JSON operator error
CREATE OR REPLACE FUNCTION public.log_assessment_audit_trail()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Insert audit record for UPDATE operations on assessment-related tables
  IF TG_OP = 'UPDATE' THEN
    -- Log each changed field with specific focus on status changes
    INSERT INTO public.audit_trail (
      organization_id, table_name, record_id, action, field_name, 
      old_value, new_value, changed_by, change_reason
    )
    SELECT 
      COALESCE(NEW.organization_id, OLD.organization_id),
      TG_TABLE_NAME,
      NEW.id,
      CASE 
        WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'status_change'
        ELSE TG_OP
      END,
      key,
      (to_jsonb(OLD)) ->> key,
      (to_jsonb(NEW)) ->> key,
      COALESCE(NEW.updated_by, auth.uid()),
      CASE 
        WHEN NEW.status IS DISTINCT FROM OLD.status THEN 
          CONCAT('Status changed from ', OLD.status, ' to ', NEW.status)
        ELSE 'Field updated'
      END
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
      COALESCE(NEW.created_by, auth.uid()),
      CONCAT(TG_TABLE_NAME, ' created')
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Fix the general audit trail function as well
CREATE OR REPLACE FUNCTION public.log_audit_trail()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Insert audit record for UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- Log each changed field
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
      auth.uid(),
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
      auth.uid(),
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
      auth.uid(),
      'User deletion'
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;