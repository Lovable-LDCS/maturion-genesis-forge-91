-- Create policy change log table for tracking AI logic and system policy updates
CREATE TABLE public.policy_change_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., "AI Logic Policy", "Security Policy", "Validation Rules"
  domain_scope TEXT NOT NULL, -- e.g., "Global", "Domain-specific", "MPS-specific"
  linked_document_id TEXT, -- Reference to the source document
  summary TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  logged_by TEXT NOT NULL, -- Role: "Superuser", "Admin", "System"
  organization_id UUID REFERENCES public.organizations(id),
  metadata JSONB DEFAULT '{}', -- Additional structured data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.policy_change_log ENABLE ROW LEVEL SECURITY;

-- Create policies for policy change log access
CREATE POLICY "Superusers and admins can view all policy logs" 
ON public.policy_change_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superuser')
  )
);

CREATE POLICY "Superusers and admins can insert policy logs" 
ON public.policy_change_log 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superuser')
  )
);

CREATE POLICY "Superusers can update policy logs" 
ON public.policy_change_log 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND role = 'superuser'
  )
);

-- Create function to log policy changes
CREATE OR REPLACE FUNCTION public.log_policy_change(
  title_param TEXT,
  type_param TEXT,
  domain_scope_param TEXT,
  summary_param TEXT,
  linked_document_id_param TEXT DEFAULT NULL,
  tags_param TEXT[] DEFAULT '{}',
  logged_by_param TEXT DEFAULT 'System',
  organization_id_param UUID DEFAULT NULL,
  metadata_param JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_log_id UUID;
BEGIN
  INSERT INTO public.policy_change_log (
    title,
    type,
    domain_scope,
    linked_document_id,
    summary,
    tags,
    logged_by,
    organization_id,
    metadata
  ) VALUES (
    title_param,
    type_param,
    domain_scope_param,
    linked_document_id_param,
    summary_param,
    tags_param,
    logged_by_param,
    organization_id_param,
    metadata_param
  ) RETURNING id INTO new_log_id;
  
  RETURN new_log_id;
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_policy_change_log_type ON public.policy_change_log(type);
CREATE INDEX idx_policy_change_log_domain_scope ON public.policy_change_log(domain_scope);
CREATE INDEX idx_policy_change_log_created_at ON public.policy_change_log(created_at DESC);
CREATE INDEX idx_policy_change_log_tags ON public.policy_change_log USING GIN(tags);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_policy_change_log_updated_at
BEFORE UPDATE ON public.policy_change_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the example policy change log you provided
INSERT INTO public.policy_change_log (
  title,
  type,
  domain_scope,
  linked_document_id,
  summary,
  tags,
  logged_by,
  metadata
) VALUES (
  'Policy Ingested: AI Document Ingestion & Validation Policy',
  'AI Logic Policy',
  'Global – applies across all MPS and domains',
  'AI Document Ingestion & Validation Policy.docx',
  'Defines ingestion validation rules, chunk structure, and corruption handling for all uploaded documents. Introduces clean text extraction rules, Unicode compliance, corruption rejection, and fail-fast conditions. Serves as base logic for AI reasoning and integration.',
  ARRAY['AI Logic', 'Ingestion Rules', 'Validation', 'System Architecture', 'Global'],
  'Superuser',
  jsonb_build_object(
    'original_timestamp', '2025-07-28T17:58:00+02:00',
    'log_source', 'manual_entry',
    'importance_level', 'critical'
  )
);