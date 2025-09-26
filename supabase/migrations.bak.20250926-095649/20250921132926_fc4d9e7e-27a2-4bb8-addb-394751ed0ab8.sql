-- Grant missing SELECT privileges to authenticated role for key AI tables
-- Fixes 403 on return=representation and document management views

GRANT SELECT ON TABLE public.ai_documents TO authenticated;
GRANT SELECT ON TABLE public.ai_document_chunks TO authenticated;
GRANT SELECT ON TABLE public.ai_document_versions TO authenticated;

-- Audit trail entry
INSERT INTO public.audit_trail (
  organization_id, table_name, record_id, action, changed_by, change_reason
) VALUES (
  '00000000-0000-0000-0000-000000000000', 'privileges', '00000000-0000-0000-0000-000000000000',
  'GRANT_SELECT_AI_TABLES', '00000000-0000-0000-0000-000000000001',
  'Granted SELECT to authenticated on ai_documents, ai_document_chunks, ai_document_versions to allow uploads and listings'
);