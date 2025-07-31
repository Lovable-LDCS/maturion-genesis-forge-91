-- Update ai_documents domain constraint to include all existing values plus 'Global Instruction'
ALTER TABLE public.ai_documents 
DROP CONSTRAINT IF EXISTS ai_documents_domain_check;

ALTER TABLE public.ai_documents 
ADD CONSTRAINT ai_documents_domain_check 
CHECK (domain = ANY (ARRAY[
  'Leadership & Governance'::text,
  'People & Culture'::text, 
  'Process Integrity'::text,
  'Protection'::text,
  'Proof it Works'::text,
  'Cross-Domain'::text,
  'General'::text,
  'System Architecture'::text,
  'AI Logic & Behavior'::text,
  'Validation Rules'::text,
  'Security Controls'::text,
  'Global Instruction'::text,
  'Global Instruction – applies across all MPS and domains'::text,
  'Global Platform Logic – applies to all AI components, MPS logic, user pages, and guidance systems'::text
]));