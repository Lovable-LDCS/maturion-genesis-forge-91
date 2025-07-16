-- Create enums for milestone tracking
CREATE TYPE public.milestone_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE public.milestone_status AS ENUM ('not_started', 'in_progress', 'ready_for_test', 'signed_off', 'failed', 'rejected', 'escalated', 'alternative_proposal');

-- Create milestones table
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  priority milestone_priority NOT NULL DEFAULT 'medium',
  phase TEXT,
  week INTEGER,
  status milestone_status NOT NULL DEFAULT 'not_started',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL
);

-- Create milestone_tasks table
CREATE TABLE public.milestone_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status milestone_status NOT NULL DEFAULT 'not_started',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL
);

-- Create milestone_test_notes table (immutable audit trail)
CREATE TABLE public.milestone_test_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_task_id UUID NOT NULL REFERENCES public.milestone_tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  note_content TEXT NOT NULL,
  status_at_time milestone_status NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create milestone_status_history table (immutable audit trail)
CREATE TABLE public.milestone_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('milestone', 'task')),
  entity_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  old_status milestone_status,
  new_status milestone_status NOT NULL,
  change_reason TEXT,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_test_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_status_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for milestones
CREATE POLICY "Users can access their organization's milestones" 
ON public.milestones 
FOR ALL 
USING (user_can_view_organization(organization_id));

-- Create RLS policies for milestone_tasks
CREATE POLICY "Users can access their organization's milestone tasks" 
ON public.milestone_tasks 
FOR ALL 
USING (user_can_view_organization(organization_id));

-- Create RLS policies for milestone_test_notes
CREATE POLICY "Users can access their organization's test notes" 
ON public.milestone_test_notes 
FOR ALL 
USING (user_can_view_organization(organization_id));

-- Create RLS policies for milestone_status_history
CREATE POLICY "Users can access their organization's status history" 
ON public.milestone_status_history 
FOR ALL 
USING (user_can_view_organization(organization_id));

-- Create trigger for updated_at timestamps
CREATE TRIGGER update_milestones_updated_at
BEFORE UPDATE ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_milestone_tasks_updated_at
BEFORE UPDATE ON public.milestone_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to log status changes
CREATE OR REPLACE FUNCTION public.log_milestone_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.milestone_status_history (
      entity_type,
      entity_id,
      organization_id,
      old_status,
      new_status,
      change_reason,
      changed_by
    ) VALUES (
      CASE WHEN TG_TABLE_NAME = 'milestones' THEN 'milestone' ELSE 'task' END,
      NEW.id,
      NEW.organization_id,
      OLD.status,
      NEW.status,
      'Status updated via application',
      NEW.updated_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for status change logging
CREATE TRIGGER log_milestone_status_changes
AFTER UPDATE ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION public.log_milestone_status_change();

CREATE TRIGGER log_milestone_task_status_changes
AFTER UPDATE ON public.milestone_tasks
FOR EACH ROW
EXECUTE FUNCTION public.log_milestone_status_change();

-- Create indexes for performance
CREATE INDEX idx_milestones_organization_id ON public.milestones(organization_id);
CREATE INDEX idx_milestones_status ON public.milestones(status);
CREATE INDEX idx_milestones_display_order ON public.milestones(display_order);

CREATE INDEX idx_milestone_tasks_milestone_id ON public.milestone_tasks(milestone_id);
CREATE INDEX idx_milestone_tasks_organization_id ON public.milestone_tasks(organization_id);
CREATE INDEX idx_milestone_tasks_status ON public.milestone_tasks(status);
CREATE INDEX idx_milestone_tasks_display_order ON public.milestone_tasks(display_order);

CREATE INDEX idx_milestone_test_notes_task_id ON public.milestone_test_notes(milestone_task_id);
CREATE INDEX idx_milestone_test_notes_organization_id ON public.milestone_test_notes(organization_id);

CREATE INDEX idx_milestone_status_history_entity ON public.milestone_status_history(entity_type, entity_id);
CREATE INDEX idx_milestone_status_history_organization_id ON public.milestone_status_history(organization_id);