-- Fix the remaining custom functions that need search_path
CREATE OR REPLACE FUNCTION public.calculate_assessment_progress(assessment_uuid uuid)
RETURNS TABLE(total_criteria integer, completed_criteria integer, completion_percentage numeric)
LANGUAGE plpgsql
STABLE
SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_criteria,
    COUNT(CASE WHEN ase.status = 'approved_locked' THEN 1 END)::INTEGER as completed_criteria,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(CASE WHEN ase.status = 'approved_locked' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC(5,2)
    END as completion_percentage
  FROM public.assessment_scores ase
  WHERE ase.assessment_id = assessment_uuid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_criteria_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  mps_num INTEGER;
  next_criteria_num INTEGER;
BEGIN
  -- Get the MPS number
  SELECT mps_number INTO mps_num 
  FROM public.maturity_practice_statements 
  WHERE id = NEW.mps_id;
  
  -- Get the next criteria number for this MPS
  SELECT COALESCE(MAX(CAST(SPLIT_PART(criteria_number, '.', 2) AS INTEGER)), 0) + 1
  INTO next_criteria_num
  FROM public.criteria c
  JOIN public.maturity_practice_statements mps ON c.mps_id = mps.id
  WHERE mps.id = NEW.mps_id;
  
  -- Set the criteria number
  NEW.criteria_number := mps_num || '.' || next_criteria_num;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_assessment_audit_trail()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
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