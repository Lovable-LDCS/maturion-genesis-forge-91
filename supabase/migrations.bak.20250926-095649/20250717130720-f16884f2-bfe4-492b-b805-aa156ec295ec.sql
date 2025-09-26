-- Create function to update milestone status based on task completion
CREATE OR REPLACE FUNCTION public.update_milestone_status_on_task_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for milestone task updates
CREATE OR REPLACE TRIGGER trigger_update_milestone_status_on_task_change
  AFTER UPDATE OF status ON public.milestone_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_milestone_status_on_task_change();

-- Create trigger for milestone task inserts (in case tasks are added)
CREATE OR REPLACE TRIGGER trigger_update_milestone_status_on_task_insert
  AFTER INSERT ON public.milestone_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_milestone_status_on_task_change();

-- Create trigger for milestone task deletes (in case tasks are removed)
CREATE OR REPLACE TRIGGER trigger_update_milestone_status_on_task_delete
  AFTER DELETE ON public.milestone_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_milestone_status_on_task_change();