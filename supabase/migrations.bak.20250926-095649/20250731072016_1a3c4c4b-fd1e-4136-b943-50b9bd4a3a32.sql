-- Check current storage policies and create service role access for both buckets

-- Create policies for 'documents' bucket that allow service role access
CREATE POLICY "Service role can access all files in documents bucket"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'documents');

-- Create policies for 'ai_documents' bucket that allow service role access  
CREATE POLICY "Service role can access all files in ai_documents bucket"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'ai_documents');

-- Also ensure buckets exist with proper permissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']::text[]),
  ('ai_documents', 'ai_documents', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']::text[])
ON CONFLICT (id) DO NOTHING;