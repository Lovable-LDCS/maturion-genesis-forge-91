-- Add updated_by field to ai_documents table
ALTER TABLE public.ai_documents 
ADD COLUMN updated_by uuid;

-- Set default value for existing records to uploaded_by
UPDATE public.ai_documents 
SET updated_by = uploaded_by 
WHERE updated_by IS NULL;

-- Make the field NOT NULL after setting defaults
ALTER TABLE public.ai_documents 
ALTER COLUMN updated_by SET NOT NULL;