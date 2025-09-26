-- Create criteria rejection tracking table
CREATE TABLE public.criteria_rejections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criteria_id UUID NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rejected_by UUID NOT NULL,
  rejected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create criteria edit history table
CREATE TABLE public.criteria_edit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criteria_id UUID NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.criteria_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criteria_edit_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for criteria rejections
CREATE POLICY "Users can access their organization's criteria rejections" 
ON public.criteria_rejections 
FOR ALL 
USING (user_can_view_organization(organization_id));

-- Create RLS policies for criteria edit history
CREATE POLICY "Users can access their organization's criteria edit history" 
ON public.criteria_edit_history 
FOR ALL 
USING (user_can_view_organization(organization_id));

-- Create indexes for better performance
CREATE INDEX idx_criteria_rejections_criteria_id ON public.criteria_rejections(criteria_id);
CREATE INDEX idx_criteria_rejections_organization_id ON public.criteria_rejections(organization_id);
CREATE INDEX idx_criteria_edit_history_criteria_id ON public.criteria_edit_history(criteria_id);
CREATE INDEX idx_criteria_edit_history_organization_id ON public.criteria_edit_history(organization_id);