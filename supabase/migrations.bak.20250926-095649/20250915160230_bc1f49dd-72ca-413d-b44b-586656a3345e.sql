-- 1) Org-aware health view (robust version supporting both schemas)
CREATE OR REPLACE VIEW public.system_health_by_org_v1 AS
WITH doc_org AS (
  -- Path A: explicit org_id on ai_documents
  SELECT d.id AS document_id, d.organization_id
  FROM public.ai_documents d
  WHERE d.organization_id IS NOT NULL

  UNION

  -- Path B: through the mapping table
  SELECT od.document_id AS document_id, od.organization_id
  FROM public.organization_documents od
),
doc_counts AS (
  SELECT do.organization_id,
         COUNT(DISTINCT do.document_id)                                  AS total_documents,
         COUNT(c.id)                                                     AS total_chunks_attached
  FROM doc_org do
  LEFT JOIN public.ai_document_chunks c ON c.document_id = do.document_id
  GROUP BY do.organization_id
)
SELECT o.id   AS organization_id,
       o.name AS organization_name,
       COALESCE(dc.total_documents, 0)       AS total_documents,
       COALESCE(dc.total_chunks_attached, 0) AS docs_with_chunks,
       GREATEST(COALESCE(dc.total_documents, 0) - COALESCE(dc.total_chunks_attached, 0), 0) AS docs_without_chunks,
       NOW() AS generated_at
FROM public.organizations o
LEFT JOIN doc_counts dc ON dc.organization_id = o.id;

-- 2) Standardize doc type casing
INSERT INTO public.document_types(name)
SELECT 'Diamond Knowledge pack'
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_types WHERE name = 'Diamond Knowledge pack'
);

-- 3) Requeue function that matches enum values (queued|fetching|done|failed)
CREATE OR REPLACE FUNCTION public.requeue_failed_crawls(max_retries INT DEFAULT 3)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  UPDATE public.org_crawl_queue
  SET status = 'queued',
      retry_count   = COALESCE(retry_count, 0) + 1,
      last_attempt_at = NOW(),
      updated_at    = NOW(),
      error_reason  = NULL
  WHERE status = 'failed'
    AND COALESCE(retry_count, 0) < max_retries;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END$$;

-- 4) Grant UI read access on the new view
GRANT SELECT ON public.system_health_by_org_v1 TO anon, authenticated, service_role;