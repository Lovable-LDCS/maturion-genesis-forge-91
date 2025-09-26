-- Phase 1: Unified Document Upload Engine - Database Migration
-- Schema enhancements for standardized metadata and processing flow

-- Add schema_version and processing_version tracking
ALTER TABLE ai_documents 
ADD COLUMN IF NOT EXISTS processing_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS unified_upload_metadata JSONB DEFAULT '{}';

-- Create processing pipeline status tracking table
CREATE TABLE IF NOT EXISTS processing_pipeline_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on processing pipeline status
ALTER TABLE processing_pipeline_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for processing pipeline status
CREATE POLICY "Users can access their organization's pipeline status" 
ON processing_pipeline_status FOR ALL 
USING (organization_id IN (
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = auth.uid()
));

-- Create qa_metrics table for real-time monitoring
CREATE TABLE IF NOT EXISTS qa_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_data JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on qa_metrics
ALTER TABLE qa_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for qa_metrics
CREATE POLICY "Users can access their organization's QA metrics" 
ON qa_metrics FOR ALL 
USING (organization_id IN (
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = auth.uid()
));

-- Create upload_session_log for tracking unified uploads
CREATE TABLE IF NOT EXISTS upload_session_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  document_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  session_data JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on upload_session_log
ALTER TABLE upload_session_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for upload_session_log
CREATE POLICY "Users can access their organization's upload sessions" 
ON upload_session_log FOR ALL 
USING (organization_id IN (
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = auth.uid()
));

-- Create deduplication_reports table for Phase 2
CREATE TABLE IF NOT EXISTS deduplication_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'weekly',
  duplicates_found INTEGER DEFAULT 0,
  duplicates_merged INTEGER DEFAULT 0,
  report_data JSONB DEFAULT '{}',
  generated_by UUID,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on deduplication_reports
ALTER TABLE deduplication_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for deduplication_reports
CREATE POLICY "Users can access their organization's deduplication reports" 
ON deduplication_reports FOR ALL 
USING (organization_id IN (
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_documents_processing_version ON ai_documents(processing_version);
CREATE INDEX IF NOT EXISTS idx_ai_documents_schema_version ON ai_documents(schema_version);
CREATE INDEX IF NOT EXISTS idx_processing_pipeline_status_document_id ON processing_pipeline_status(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_pipeline_status_org_status ON processing_pipeline_status(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_qa_metrics_org_type_time ON qa_metrics(organization_id, metric_type, recorded_at);
CREATE INDEX IF NOT EXISTS idx_upload_session_log_org_user ON upload_session_log(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_deduplication_reports_org_generated ON deduplication_reports(organization_id, generated_at);

-- Log migration completion
INSERT INTO migration_status (migration_name, status, completed_at, notes)
VALUES (
  'phase_1_unified_upload_engine', 
  'completed',
  now(),
  'Phase 1: Database schema prepared for unified document upload engine with QA monitoring tables'
);