-- Fix security issues identified by the linter

-- 1. Fix function search path issues for custom functions
-- Update functions to have secure search_path settings

CREATE OR REPLACE FUNCTION public.log_admin_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.admin_activity_log (
    admin_user_id,
    action_type,
    entity_type,
    entity_id,
    details
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_organization_owner_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Always set owner_id to current authenticated user
  NEW.owner_id = auth.uid();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.expire_approval_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.admin_approval_requests 
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at < now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_failed_document(doc_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Delete any existing chunks for this document
  DELETE FROM public.ai_document_chunks WHERE document_id = doc_id;
  
  -- Reset the document status to pending
  UPDATE public.ai_documents 
  SET processing_status = 'pending',
      processed_at = NULL,
      total_chunks = 0,
      updated_at = now()
  WHERE id = doc_id;
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_audit_trail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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