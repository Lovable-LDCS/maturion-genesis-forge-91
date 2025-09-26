-- Create document versions table for version control and ISO compliance
CREATE TABLE public.ai_document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  domain TEXT,
  tags TEXT,
  upload_notes TEXT,
  document_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  change_reason TEXT,
  organization_id UUID NOT NULL,
  
  -- Ensure unique version numbers per document
  CONSTRAINT unique_document_version UNIQUE (document_id, version_number)
);

-- Enable RLS on versions table
ALTER TABLE public.ai_document_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for document versions
CREATE POLICY "Users can view versions from their organization" 
ON public.ai_document_versions 
FOR SELECT 
USING (organization_id IN (
  SELECT om.organization_id 
  FROM organization_members om 
  WHERE om.user_id = auth.uid()
));

CREATE POLICY "Admins can create versions" 
ON public.ai_document_versions 
FOR INSERT 
WITH CHECK (organization_id IN (
  SELECT om.organization_id 
  FROM organization_members om 
  WHERE om.user_id = auth.uid() 
  AND om.role = ANY(ARRAY['admin', 'owner'])
));

-- Function to create a new version when document is updated
CREATE OR REPLACE FUNCTION create_document_version()
RETURNS TRIGGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  -- Only create version if this is an update (not insert)
  IF TG_OP = 'UPDATE' THEN
    -- Get the current max version for this document
    SELECT COALESCE(MAX(version_number), 0) INTO max_version
    FROM public.ai_document_versions 
    WHERE document_id = OLD.id;
    
    -- Create new version record with previous data
    INSERT INTO public.ai_document_versions (
      document_id,
      version_number,
      title,
      domain,
      tags,
      upload_notes,
      document_type,
      metadata,
      file_path,
      file_name,
      file_size,
      mime_type,
      created_by,
      organization_id,
      change_reason
    ) VALUES (
      OLD.id,
      max_version + 1,
      OLD.title,
      OLD.domain,
      OLD.tags,
      OLD.upload_notes,
      OLD.document_type,
      OLD.metadata,
      OLD.file_path,
      OLD.file_name,
      OLD.file_size,
      OLD.mime_type,
      NEW.updated_by,
      OLD.organization_id,
      COALESCE(NEW.metadata->>'change_reason', 'Document updated')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically version documents on update
CREATE TRIGGER ai_document_versioning_trigger
  BEFORE UPDATE ON public.ai_documents
  FOR EACH ROW
  EXECUTE FUNCTION create_document_version();

-- Create indexes for better performance
CREATE INDEX idx_ai_document_versions_document_id ON public.ai_document_versions(document_id);
CREATE INDEX idx_ai_document_versions_created_at ON public.ai_document_versions(created_at DESC);
CREATE INDEX idx_ai_document_versions_org_id ON public.ai_document_versions(organization_id);