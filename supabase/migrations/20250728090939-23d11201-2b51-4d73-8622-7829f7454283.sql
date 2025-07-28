-- Fix domain column issue by adding missing order_index column
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Update existing domains with proper order_index values
UPDATE public.domains 
SET order_index = display_order
WHERE order_index = 0;

-- Create maturity_practice_statements for each domain to establish proper MPS structure
INSERT INTO public.maturity_practice_statements (
  domain_id,
  organization_id, 
  mps_number,
  name,
  summary,
  status,
  created_by,
  updated_by
)
SELECT 
  d.id,
  d.organization_id,
  CASE d.name 
    WHEN 'Leadership & Governance' THEN 1
    WHEN 'Process Integrity' THEN 6  
    WHEN 'People & Culture' THEN 11
    WHEN 'Protection' THEN 15
    WHEN 'Proof it Works' THEN 21
  END,
  d.name || ' MPS',
  'Primary maturity practice statement for ' || d.name,
  'not_started',
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid
FROM public.domains d 
WHERE d.organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
  AND NOT EXISTS (
    SELECT 1 FROM public.maturity_practice_statements mps 
    WHERE mps.domain_id = d.id
  );