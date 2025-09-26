-- Smart Chunk Reuse Implementation
-- Add flag to track documents that have been chunked via testing facility
ALTER TABLE public.ai_documents 
ADD COLUMN chunked_from_tester BOOLEAN DEFAULT FALSE,
ADD COLUMN tester_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN tester_approved_by UUID;

-- Create approved chunks cache table
CREATE TABLE public.approved_chunks_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  extraction_method TEXT DEFAULT 'chunk_tester',
  approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID NOT NULL,
  organization_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on approved chunks cache
ALTER TABLE public.approved_chunks_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for approved chunks cache
CREATE POLICY "Users can view approved chunks from their organization" 
ON public.approved_chunks_cache 
FOR SELECT 
USING (organization_id IN (
  SELECT om.organization_id 
  FROM organization_members om 
  WHERE om.user_id = auth.uid()
));

CREATE POLICY "Admins can insert approved chunks" 
ON public.approved_chunks_cache 
FOR INSERT 
WITH CHECK (organization_id IN (
  SELECT om.organization_id 
  FROM organization_members om 
  WHERE om.user_id = auth.uid() 
    AND om.role IN ('admin', 'owner')
));

CREATE POLICY "System can manage approved chunks" 
ON public.approved_chunks_cache 
FOR ALL 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_approved_chunks_document_id ON public.approved_chunks_cache(document_id);
CREATE INDEX idx_approved_chunks_org_id ON public.approved_chunks_cache(organization_id);

-- Add comment for documentation
COMMENT ON TABLE public.approved_chunks_cache IS 'Stores pre-approved document chunks from the chunk testing facility to enable smart reuse during backoffice processing';