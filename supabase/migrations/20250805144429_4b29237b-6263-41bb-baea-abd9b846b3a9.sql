-- Drop the existing function and recreate with correct signature
DROP FUNCTION IF EXISTS public.validate_file_upload(text, bigint, text);

-- Create the validate_file_upload function with correct return type
CREATE OR REPLACE FUNCTION public.validate_file_upload(
  file_name text,
  file_size bigint,
  mime_type text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sanitized_name text;
  max_size_mb integer := 100; -- 100MB limit
  allowed_types text[] := ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
BEGIN
  -- Check file size (convert to MB)
  IF file_size > (max_size_mb * 1024 * 1024) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'File size exceeds ' || max_size_mb || 'MB limit'
    );
  END IF;
  
  -- Check MIME type
  IF NOT (mime_type = ANY(allowed_types)) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'File type not allowed. Supported: PDF, Word, Excel, Text, CSV'
    );
  END IF;
  
  -- Sanitize filename: remove special characters, normalize spaces and dashes
  sanitized_name := file_name;
  
  -- Replace special characters with safe alternatives
  sanitized_name := regexp_replace(sanitized_name, '[^\w\s\.-]', '', 'g');
  -- Replace multiple spaces/underscores with single dash
  sanitized_name := regexp_replace(sanitized_name, '[\s_]+', '-', 'g');
  -- Replace multiple dashes with single dash
  sanitized_name := regexp_replace(sanitized_name, '-+', '-', 'g');
  -- Remove leading/trailing dashes
  sanitized_name := trim(sanitized_name, '-');
  
  -- Ensure filename isn't empty after sanitization
  IF LENGTH(sanitized_name) = 0 THEN
    sanitized_name := 'document-' || extract(epoch from now())::bigint;
  END IF;
  
  -- Return success with sanitized name
  RETURN jsonb_build_object(
    'valid', true,
    'sanitized_name', sanitized_name
  );
END;
$$;