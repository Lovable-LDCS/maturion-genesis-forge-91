-- Fix security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION public.update_ai_ingested_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-mark as AI ingested when processing completes with chunks
  IF NEW.processing_status = 'completed' AND NEW.total_chunks > 0 THEN
    NEW.is_ai_ingested = true;
  ELSIF NEW.processing_status IN ('pending', 'processing', 'failed') THEN
    NEW.is_ai_ingested = false;
  END IF;
  
  RETURN NEW;
END;
$$;