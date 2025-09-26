-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create storage bucket for AI documents
INSERT INTO storage.buckets (id, name, public) VALUES ('ai-documents', 'ai-documents', false);

-- Create AI documents table to track uploaded files
CREATE TABLE public.ai_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('maturity_model', 'sector_context', 'scoring_logic', 'sop_template', 'general')),
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  total_chunks INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create AI document chunks table for vectorized content
CREATE TABLE public.ai_document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small size
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI upload audit table
CREATE TABLE public.ai_upload_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  document_id UUID REFERENCES public.ai_documents(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('upload', 'process', 'delete', 'access')),
  user_id UUID NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ai_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_upload_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_documents
CREATE POLICY "Users can view documents from their organization" 
ON public.ai_documents 
FOR SELECT 
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM public.organization_members om 
    WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can insert documents" 
ON public.ai_documents 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id 
    FROM public.organization_members om 
    WHERE om.user_id = auth.uid() 
    AND om.role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins can update documents" 
ON public.ai_documents 
FOR UPDATE 
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM public.organization_members om 
    WHERE om.user_id = auth.uid() 
    AND om.role IN ('admin', 'owner')
  )
);

-- Create RLS policies for ai_document_chunks
CREATE POLICY "Users can view chunks from their organization" 
ON public.ai_document_chunks 
FOR SELECT 
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM public.organization_members om 
    WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage chunks" 
ON public.ai_document_chunks 
FOR ALL 
USING (true);

-- Create RLS policies for ai_upload_audit
CREATE POLICY "Admins can view audit logs" 
ON public.ai_upload_audit 
FOR SELECT 
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM public.organization_members om 
    WHERE om.user_id = auth.uid() 
    AND om.role IN ('admin', 'owner')
  )
);

CREATE POLICY "System can insert audit logs" 
ON public.ai_upload_audit 
FOR INSERT 
WITH CHECK (true);

-- Create storage policies for ai-documents bucket
CREATE POLICY "Admins can upload AI documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'ai-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view AI documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ai-documents');

CREATE POLICY "Admins can update AI documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'ai-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can delete AI documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'ai-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create indexes for performance
CREATE INDEX idx_ai_documents_org_id ON public.ai_documents(organization_id);
CREATE INDEX idx_ai_documents_status ON public.ai_documents(processing_status);
CREATE INDEX idx_ai_document_chunks_doc_id ON public.ai_document_chunks(document_id);
CREATE INDEX idx_ai_document_chunks_org_id ON public.ai_document_chunks(organization_id);
CREATE INDEX idx_ai_upload_audit_org_id ON public.ai_upload_audit(organization_id);

-- Create trigger for updated_at
CREATE TRIGGER update_ai_documents_updated_at
  BEFORE UPDATE ON public.ai_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();