-- Create gap tickets table for tracking missing specifics and follow-ups
CREATE TABLE IF NOT EXISTS public.gap_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  missing_specifics TEXT[] NOT NULL DEFAULT '{}',
  follow_up_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  email_sent BOOLEAN NOT NULL DEFAULT false,
  response_received BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_gap_tickets_org_status ON public.gap_tickets(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_gap_tickets_follow_up_date ON public.gap_tickets(follow_up_date) WHERE status IN ('pending', 'scheduled');

-- Enable RLS
ALTER TABLE public.gap_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gap tickets
CREATE POLICY "Users can view gap tickets for their organization" 
ON public.gap_tickets 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage gap tickets for their organization" 
ON public.gap_tickets 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

-- Add audit trigger for gap tickets
CREATE TRIGGER audit_gap_tickets
  AFTER INSERT OR UPDATE OR DELETE ON public.gap_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- Add update trigger for gap tickets
CREATE TRIGGER update_gap_tickets_updated_at
  BEFORE UPDATE ON public.gap_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();