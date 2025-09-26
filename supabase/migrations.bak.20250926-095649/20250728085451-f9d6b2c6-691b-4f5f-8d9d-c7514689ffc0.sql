-- Create missing domains for MPS document mapping
-- Using organization owner ID as fallback for created_by/updated_by
INSERT INTO public.domains (
  name,
  display_order,
  organization_id,
  status,
  created_by,
  updated_by
) VALUES 
  ('Process Integrity', 2, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', (SELECT owner_id FROM public.organizations WHERE id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'), (SELECT owner_id FROM public.organizations WHERE id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d')),
  ('People & Culture', 3, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', (SELECT owner_id FROM public.organizations WHERE id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'), (SELECT owner_id FROM public.organizations WHERE id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d')),
  ('Protection', 4, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', (SELECT owner_id FROM public.organizations WHERE id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'), (SELECT owner_id FROM public.organizations WHERE id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d')),
  ('Proof it Works', 5, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', (SELECT owner_id FROM public.organizations WHERE id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'), (SELECT owner_id FROM public.organizations WHERE id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'));