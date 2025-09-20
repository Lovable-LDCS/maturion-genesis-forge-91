-- Create data sources table for managing external connections
CREATE TABLE public.data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('supabase', 'google_drive', 'sharepoint', 'onedrive', 'dropbox', 'api_endpoint', 'database', 'file_system', 'other')),
  connection_config JSONB NOT NULL DEFAULT '{}',
  credentials_encrypted TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'never_synced' CHECK (sync_status IN ('never_synced', 'syncing', 'success', 'failed', 'partial')),
  sync_error_message TEXT,
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(organization_id, source_name)
);

-- Create evidence submissions table with data source reference
CREATE TABLE public.evidence_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  criteria_id UUID,
  assessment_id UUID,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('document', 'image', 'video', 'audio', 'link', 'api_data', 'structured_data', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  evidence_data JSONB DEFAULT '{}',
  submission_method TEXT DEFAULT 'manual' CHECK (submission_method IN ('manual', 'api', 'sync', 'automated')),
  submitted_by UUID NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  evaluation_status TEXT DEFAULT 'pending' CHECK (evaluation_status IN ('pending', 'processing', 'completed', 'failed', 'rejected')),
  evaluation_result JSONB DEFAULT '{}',
  ai_confidence_score NUMERIC(5,2),
  human_review_required BOOLEAN DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_comments TEXT,
  maturity_level_suggestion TEXT,
  compliance_score NUMERIC(5,2),
  risk_indicators JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Create API usage log table
CREATE TABLE public.api_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_payload JSONB DEFAULT '{}',
  response_status INTEGER,
  response_data JSONB DEFAULT '{}',
  execution_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  request_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Create learning feedback log table
CREATE TABLE public.learning_feedback_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('evaluation_correction', 'suggestion_improvement', 'pattern_recognition', 'false_positive', 'false_negative', 'quality_feedback')),
  original_content TEXT,
  corrected_content TEXT,
  confidence_before NUMERIC(5,2),
  confidence_after NUMERIC(5,2),
  learning_context JSONB DEFAULT '{}',
  evidence_submission_id UUID REFERENCES public.evidence_submissions(id) ON DELETE CASCADE,
  criteria_id UUID,
  assessment_id UUID,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  applied_to_model BOOLEAN DEFAULT false,
  applied_at TIMESTAMP WITH TIME ZONE,
  impact_score NUMERIC(5,2),
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'rejected', 'applied')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Create data source sync logs table
CREATE TABLE public.data_source_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_source_id UUID NOT NULL REFERENCES public.data_sources(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  sync_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sync_completed_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (sync_status IN ('in_progress', 'completed', 'failed', 'partial')),
  items_processed INTEGER DEFAULT 0,
  items_added INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_messages TEXT[],
  sync_summary JSONB DEFAULT '{}',
  triggered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_feedback_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_source_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data_sources
CREATE POLICY "Users can access their organization's data sources"
ON public.data_sources
FOR ALL
USING (user_can_view_organization(organization_id));

-- RLS Policies for evidence_submissions
CREATE POLICY "Users can access their organization's evidence submissions"
ON public.evidence_submissions
FOR ALL
USING (user_can_view_organization(organization_id));

-- RLS Policies for api_usage_log
CREATE POLICY "Users can access their organization's API usage logs"
ON public.api_usage_log
FOR ALL
USING (user_can_view_organization(organization_id));

-- RLS Policies for learning_feedback_log
CREATE POLICY "Users can access their organization's learning feedback"
ON public.learning_feedback_log
FOR ALL
USING (user_can_view_organization(organization_id));

-- RLS Policies for data_source_sync_logs
CREATE POLICY "Users can access their organization's sync logs"
ON public.data_source_sync_logs
FOR ALL
USING (user_can_view_organization(organization_id));

-- Create indexes for performance
CREATE INDEX idx_data_sources_org_id ON public.data_sources(organization_id);
CREATE INDEX idx_data_sources_type_active ON public.data_sources(source_type, is_active);
CREATE INDEX idx_evidence_submissions_org_id ON public.evidence_submissions(organization_id);
CREATE INDEX idx_evidence_submissions_criteria ON public.evidence_submissions(criteria_id);
CREATE INDEX idx_evidence_submissions_data_source ON public.evidence_submissions(data_source_id);
CREATE INDEX idx_evidence_submissions_status ON public.evidence_submissions(evaluation_status);
CREATE INDEX idx_api_usage_log_org_endpoint ON public.api_usage_log(organization_id, endpoint);
CREATE INDEX idx_api_usage_log_created_at ON public.api_usage_log(created_at);
CREATE INDEX idx_learning_feedback_org_type ON public.learning_feedback_log(organization_id, feedback_type);
CREATE INDEX idx_data_source_sync_logs_source_id ON public.data_source_sync_logs(data_source_id);

-- Create updated_at triggers
CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON public.data_sources
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER update_evidence_submissions_updated_at
  BEFORE UPDATE ON public.evidence_submissions
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER update_learning_feedback_log_updated_at
  BEFORE UPDATE ON public.learning_feedback_log
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- Insert default data source for existing Supabase instance
INSERT INTO public.data_sources (
  organization_id,
  source_name,
  source_type,
  connection_config,
  is_active,
  created_by,
  updated_by,
  metadata
)
SELECT 
  o.id,
  'Primary Supabase Instance',
  'supabase',
  jsonb_build_object(
    'project_url', 'https://dmhlxhatogrrrvuruayv.supabase.co',
    'is_primary', true,
    'supports_realtime', true,
    'supports_storage', true
  ),
  true,
  o.owner_id,
  o.owner_id,
  jsonb_build_object(
    'auto_created', true,
    'description', 'Default Supabase data source for this organization'
  )
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.data_sources ds 
  WHERE ds.organization_id = o.id 
  AND ds.source_type = 'supabase'
);