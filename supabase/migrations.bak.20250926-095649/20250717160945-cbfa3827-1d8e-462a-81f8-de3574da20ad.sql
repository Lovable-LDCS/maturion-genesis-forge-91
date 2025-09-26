-- Add title field to ai_documents table
ALTER TABLE public.ai_documents 
ADD COLUMN title TEXT;

-- Set default title for existing records (use file_name without extension)
UPDATE public.ai_documents 
SET title = CASE 
  WHEN file_name ~ '\.[^.]*$' THEN 
    regexp_replace(file_name, '\.[^.]*$', '')
  ELSE 
    file_name
END
WHERE title IS NULL;