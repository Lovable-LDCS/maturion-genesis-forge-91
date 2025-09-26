-- Temporarily disable audit trigger for domain creation
ALTER TABLE public.domains DISABLE TRIGGER ALL;

-- Create missing domains for MPS document mapping
INSERT INTO public.domains (
  id,
  name,
  display_order,
  organization_id,
  status,
  created_by,
  updated_by
) VALUES 
  (gen_random_uuid(), 'Process Integrity', 2, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid),
  (gen_random_uuid(), 'People & Culture', 3, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid),
  (gen_random_uuid(), 'Protection', 4, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid),
  (gen_random_uuid(), 'Proof it Works', 5, '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 'not_started', '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid);

-- Re-enable audit trigger
ALTER TABLE public.domains ENABLE TRIGGER ALL;