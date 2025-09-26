-- Fix the audit trigger to handle cases where auth.uid() might be null
CREATE OR REPLACE FUNCTION public.log_assessment_audit_trail()
RETURNS TRIGGER AS $$
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
      OLD.* ->> key,
      NEW.* ->> key,
      COALESCE(NEW.updated_by, auth.uid(), NEW.created_by, '00000000-0000-0000-0000-000000000000'),
      CASE 
        WHEN NEW.status IS DISTINCT FROM OLD.status THEN 
          CONCAT('Status changed from ', OLD.status, ' to ', NEW.status)
        ELSE 'Field updated'
      END
    FROM jsonb_each_text(to_jsonb(NEW)) 
    WHERE NEW.* ->> key IS DISTINCT FROM OLD.* ->> key
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
      COALESCE(NEW.created_by, auth.uid(), '00000000-0000-0000-0000-000000000000'),
      CONCAT(TG_TABLE_NAME, ' created')
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Now create the sample data with the fixed trigger
INSERT INTO public.domains (name, intent_statement, organization_id, display_order, created_by, updated_by) 
SELECT 'Governance and Risk Management', 'Establish effective governance structures and risk management processes to ensure organizational accountability and decision-making transparency.', '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9', 1, '9ef75fc4-0a45-4c90-bd26-1b5898846326', '9ef75fc4-0a45-4c90-bd26-1b5898846326'
WHERE NOT EXISTS (SELECT 1 FROM domains WHERE name = 'Governance and Risk Management' AND organization_id = '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9');

-- Sign off all Assessment Framework Phase 1A tasks to complete the milestone
UPDATE milestone_tasks 
SET status = 'signed_off', updated_at = now(), updated_by = '9ef75fc4-0a45-4c90-bd26-1b5898846326'
WHERE milestone_id = '2fa0343c-b256-46c3-9886-2345dca1aa67';