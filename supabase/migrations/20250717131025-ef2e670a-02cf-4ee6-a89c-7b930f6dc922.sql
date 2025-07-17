-- Fix the delete trigger to use OLD instead of NEW
DROP TRIGGER IF EXISTS trigger_update_milestone_status_on_task_delete ON public.milestone_tasks;

-- Create a separate function for task deletion that uses OLD
CREATE OR REPLACE FUNCTION public.update_milestone_status_on_task_delete()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for milestone task deletes
CREATE TRIGGER trigger_update_milestone_status_on_task_delete
  AFTER DELETE ON public.milestone_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_milestone_status_on_task_delete();

-- Now manually update the existing milestone that should be signed_off
UPDATE public.milestones 
SET status = 'signed_off',
    updated_at = now()
WHERE id = 'b5f7eeff-38d2-4df9-82d8-baf81bcf670e';