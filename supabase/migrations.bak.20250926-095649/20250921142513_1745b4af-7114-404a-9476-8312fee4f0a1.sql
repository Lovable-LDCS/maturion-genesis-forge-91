-- Create conversation_history table for Responses API state management
CREATE TABLE IF NOT EXISTS public.conversation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  openai_response_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation history access
CREATE POLICY "Users can view their organization's conversation history" 
ON public.conversation_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = conversation_history.organization_id 
      AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert conversation history for their organization" 
ON public.conversation_history 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = conversation_history.organization_id 
      AND om.user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_conversation_history_org_created 
ON public.conversation_history (organization_id, created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_conversation_history_updated_at
  BEFORE UPDATE ON public.conversation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();