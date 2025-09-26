-- Phase 2: Fix remaining database security functions

-- Fix the remaining functions that are missing search_path
CREATE OR REPLACE FUNCTION public.set_organization_owner_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Always set owner_id to current authenticated user
  NEW.owner_id = auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_approval_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.admin_approval_requests 
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.update_milestone_status_on_task_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  total_tasks INTEGER;
  signed_off_tasks INTEGER;
  new_status milestone_status;
BEGIN
  -- Count total tasks for this milestone
  SELECT COUNT(*) INTO total_tasks
  FROM public.milestone_tasks 
  WHERE milestone_id = NEW.milestone_id;
  
  -- Count signed off tasks for this milestone
  SELECT COUNT(*) INTO signed_off_tasks
  FROM public.milestone_tasks 
  WHERE milestone_id = NEW.milestone_id 
    AND status = 'signed_off';
  
  -- Determine new milestone status
  IF total_tasks = 0 THEN
    new_status := 'not_started';
  ELSIF signed_off_tasks = total_tasks THEN
    new_status := 'signed_off';
  ELSIF signed_off_tasks > 0 THEN
    new_status := 'in_progress';
  ELSE
    new_status := 'not_started';
  END IF;
  
  -- Update milestone status
  UPDATE public.milestones 
  SET status = new_status,
      updated_at = now(),
      updated_by = NEW.updated_by
  WHERE id = NEW.milestone_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_milestone_status_on_task_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  total_tasks INTEGER;
  signed_off_tasks INTEGER;
  new_status milestone_status;
BEGIN
  -- Count total tasks for this milestone
  SELECT COUNT(*) INTO total_tasks
  FROM public.milestone_tasks 
  WHERE milestone_id = OLD.milestone_id;
  
  -- Count signed off tasks for this milestone
  SELECT COUNT(*) INTO signed_off_tasks
  FROM public.milestone_tasks 
  WHERE milestone_id = OLD.milestone_id 
    AND status = 'signed_off';
  
  -- Determine new milestone status
  IF total_tasks = 0 THEN
    new_status := 'not_started';
  ELSIF signed_off_tasks = total_tasks THEN
    new_status := 'signed_off';
  ELSIF signed_off_tasks > 0 THEN
    new_status := 'in_progress';
  ELSE
    new_status := 'not_started';
  END IF;
  
  -- Update milestone status
  UPDATE public.milestones 
  SET status = new_status,
      updated_at = now(),
      updated_by = OLD.updated_by
  WHERE id = OLD.milestone_id;
  
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_failed_document(doc_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  invitation_record RECORD;
  user_email_var TEXT;
  new_member_id UUID;
BEGIN
  -- Get the current user's email from auth.users
  SELECT email INTO user_email_var 
  FROM auth.users 
  WHERE id = auth.uid();
  
  IF user_email_var IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Find the invitation with organization details
  SELECT 
    oi.*,
    o.name as org_name,
    o.description as org_description
  INTO invitation_record 
  FROM public.organization_invitations oi
  JOIN public.organizations o ON oi.organization_id = o.id
  WHERE oi.invitation_token = invitation_token_param 
    AND oi.status = 'pending' 
    AND oi.expires_at > now()
    AND oi.email = user_email_var;
  
  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1 FROM public.organization_invitations 
      WHERE invitation_token = invitation_token_param 
        AND status = 'pending' 
        AND expires_at > now()
    ) THEN
      RETURN json_build_object('success', false, 'error', 'Invitation email does not match your account');
    END IF;
    
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = invitation_record.organization_id 
      AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this organization');
  END IF;
  
  -- Create the membership
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (invitation_record.organization_id, auth.uid(), invitation_record.role)
  RETURNING id INTO new_member_id;
  
  -- Mark invitation as accepted
  UPDATE public.organization_invitations 
  SET status = 'accepted', updated_at = now()
  WHERE id = invitation_record.id;
  
  RETURN json_build_object(
    'success', true, 
    'member_id', new_member_id,
    'organization_id', invitation_record.organization_id,
    'organization_name', invitation_record.org_name,
    'organization_description', invitation_record.org_description,
    'role', invitation_record.role
  );
END;
$$;

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
$$;

CREATE OR REPLACE FUNCTION public.calculate_assessment_progress(assessment_uuid uuid)
RETURNS TABLE(total_criteria integer, completed_criteria integer, completion_percentage numeric)
LANGUAGE plpgsql
STABLE
SET search_path TO ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.reset_my_mps_documents()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
  SELECT public.reset_mps_documents_for_reprocessing(user_org_id) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_criteria_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
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
$$;