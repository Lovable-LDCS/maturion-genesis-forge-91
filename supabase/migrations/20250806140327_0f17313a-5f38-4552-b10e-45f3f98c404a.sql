-- Update database constraint to allow 'ai_only' visibility
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ai_documents_visibility_check' 
    AND table_name = 'ai_documents'
  ) THEN
    ALTER TABLE ai_documents DROP CONSTRAINT ai_documents_visibility_check;
  END IF;
  
  -- Add new constraint with ai_only option
  ALTER TABLE ai_documents 
  ADD CONSTRAINT ai_documents_visibility_check 
  CHECK (
    (metadata->>'visibility') IN ('all_users', 'superusers_only', 'ai_only')
    OR (metadata->>'visibility') IS NULL
  );
END $$;