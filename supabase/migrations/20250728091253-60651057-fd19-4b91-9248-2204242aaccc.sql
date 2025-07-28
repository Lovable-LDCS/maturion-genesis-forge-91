-- Step 1: Update existing MPSs to correct domains
UPDATE maturity_practice_statements 
SET domain_id = (
  SELECT id FROM domains 
  WHERE name = 'Process Integrity' 
    AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
)
WHERE mps_number IN (6,7,8,9,10) 
  AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d';

UPDATE maturity_practice_statements 
SET domain_id = (
  SELECT id FROM domains 
  WHERE name = 'People & Culture' 
    AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
)
WHERE mps_number IN (11,12,13,14) 
  AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d';

UPDATE maturity_practice_statements 
SET domain_id = (
  SELECT id FROM domains 
  WHERE name = 'Protection' 
    AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
)
WHERE mps_number IN (15,16,17,18,19,20) 
  AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d';

UPDATE maturity_practice_statements 
SET domain_id = (
  SELECT id FROM domains 
  WHERE name = 'Proof it Works' 
    AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
)
WHERE mps_number IN (21,22,23,24,25) 
  AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d';

-- Step 2: Insert missing MPSs that have documents but no MPS records
INSERT INTO maturity_practice_statements (
  domain_id,
  organization_id,
  mps_number,
  name,
  summary,
  status,
  created_by,
  updated_by
) VALUES
((SELECT id FROM domains WHERE name = 'Process Integrity' AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'), '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 7, 'Process Control and Operational Failure Management', 'MPS for Process Control', 'not_started', '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid),
((SELECT id FROM domains WHERE name = 'Process Integrity' AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'), '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 8, 'Maintenance and Housekeeping', 'MPS for Maintenance', 'not_started', '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid),
((SELECT id FROM domains WHERE name = 'Process Integrity' AND organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'), '2f122a62-ca59-4c8e-adf6-796aa7011c5d', 9, 'Management of Change', 'MPS for Change Management', 'not_started', '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (organization_id, mps_number) DO NOTHING;