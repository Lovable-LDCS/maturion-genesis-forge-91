-- Fix MPS assignments to correct domains and add missing MPSs
-- First, get domain IDs for reference
WITH domain_mapping AS (
  SELECT 
    d.id,
    d.name,
    CASE d.name
      WHEN 'Leadership & Governance' THEN ARRAY[1,2,3,4,5]
      WHEN 'Process Integrity' THEN ARRAY[6,7,8,9,10]  
      WHEN 'People & Culture' THEN ARRAY[11,12,13,14]
      WHEN 'Protection' THEN ARRAY[15,16,17,18,19,20]
      WHEN 'Proof it Works' THEN ARRAY[21,22,23,24,25]
    END as mps_numbers
  FROM domains d 
  WHERE d.organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
)
-- Update existing MPSs to correct domains
UPDATE maturity_practice_statements 
SET 
  domain_id = dm.id,
  updated_at = now()
FROM domain_mapping dm
WHERE maturity_practice_statements.mps_number = ANY(dm.mps_numbers)
  AND maturity_practice_statements.organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d';

-- Insert missing MPSs for each domain
INSERT INTO maturity_practice_statements (
  domain_id,
  organization_id,
  mps_number, 
  name,
  summary,
  status,
  created_by,
  updated_by
)
SELECT DISTINCT
  dm.id,
  '2f122a62-ca59-4c8e-adf6-796aa7011c5d',
  unnest_mps.mps_num,
  CASE unnest_mps.mps_num
    WHEN 6 THEN 'Quality Assurance and Process Integrity'
    WHEN 7 THEN 'Process Control and Operational Failure Management'  
    WHEN 8 THEN 'Maintenance and Housekeeping'
    WHEN 9 THEN 'Management of Change'
    WHEN 10 THEN 'Sales Controls, Ethics, and Fraud Prevention'
    WHEN 12 THEN 'Reliable People'
    WHEN 13 THEN 'Engagement and Communication'
    WHEN 14 THEN 'Continuous Improvement'
    WHEN 16 THEN 'Technical Systems'
    WHEN 17 THEN 'Security Operations (Patrolling and Guarding)'
    WHEN 18 THEN 'Secure Transport and Logistics'
    WHEN 19 THEN 'Surveillance and Analysis'
    WHEN 20 THEN 'Resilience and Recovery'
    WHEN 22 THEN 'Investigations and Incident Management'
    WHEN 23 THEN 'Audits and Reviews'
    WHEN 24 THEN 'Security Information Management and Analysis'
    WHEN 25 THEN 'Remote Assurance'
  END,
  'Maturity Practice Statement for ' || dm.name,
  'not_started',
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid
FROM domain_mapping dm
CROSS JOIN LATERAL unnest(dm.mps_numbers) AS unnest_mps(mps_num)
WHERE NOT EXISTS (
  SELECT 1 FROM maturity_practice_statements existing_mps
  WHERE existing_mps.mps_number = unnest_mps.mps_num
    AND existing_mps.organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
);