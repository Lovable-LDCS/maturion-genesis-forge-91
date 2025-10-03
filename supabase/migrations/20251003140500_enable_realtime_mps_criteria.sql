-- up
-- Ensure realtime publication includes the key tables for dashboard updates
DO $$
BEGIN
  -- Add if not already present
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.maturity_practice_statements';
  EXCEPTION WHEN duplicate_object THEN
    -- already present; ignore
    NULL;
  END;

  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.criteria';
  EXCEPTION WHEN duplicate_object THEN
    -- already present; ignore
    NULL;
  END;
END $$;

-- down
-- Attempt to remove tables from publication (optional; safe to skip)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.maturity_practice_statements';
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.criteria';
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
END $$;
