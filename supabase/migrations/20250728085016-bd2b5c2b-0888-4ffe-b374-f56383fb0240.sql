-- Create missing domains for MPS document mapping
INSERT INTO public.domains (
  name,
  display_order,
  organization_id,
  status,
  created_by,
  updated_by
) VALUES 
  ('Process Integrity', 2, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', auth.uid(), auth.uid()),
  ('People & Culture', 3, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', auth.uid(), auth.uid()),
  ('Protection', 4, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', auth.uid(), auth.uid()),
  ('Proof it Works', 5, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', auth.uid(), auth.uid());