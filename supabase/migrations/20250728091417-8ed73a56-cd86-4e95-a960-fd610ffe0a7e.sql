-- Add remaining missing MPSs 
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
SELECT 
  d.id,
  '2f122a62-ca59-4c8e-adf6-796aa7011c5d',
  mps_data.mps_number,
  mps_data.name,
  mps_data.summary,
  'not_started',
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid
FROM (VALUES
  ('Process Integrity', 10, 'Sales Controls, Ethics, and Fraud Prevention', 'Ethics and fraud prevention controls'),
  ('People & Culture', 12, 'Reliable People', 'Ensuring reliable workforce'),
  ('People & Culture', 13, 'Engagement and Communication', 'Employee engagement processes'),
  ('People & Culture', 14, 'Continuous Improvement', 'Continuous improvement culture'),
  ('Protection', 16, 'Technical Systems', 'Technical security systems'),
  ('Protection', 17, 'Security Operations (Patrolling and Guarding)', 'Security operations and guarding'),
  ('Protection', 18, 'Secure Transport and Logistics', 'Transport security measures'),
  ('Protection', 19, 'Surveillance and Analysis', 'Surveillance systems and analysis'),
  ('Protection', 20, 'Resilience and Recovery', 'Business resilience and recovery'),
  ('Proof it Works', 22, 'Investigations and Incident Management', 'Investigation and incident processes'),
  ('Proof it Works', 23, 'Audits and Reviews', 'Audit and review processes'),
  ('Proof it Works', 24, 'Security Information Management and Analysis', 'Security information systems'),
  ('Proof it Works', 25, 'Remote Assurance', 'Remote assurance capabilities')
) AS mps_data(domain_name, mps_number, name, summary)
JOIN domains d ON d.name = mps_data.domain_name AND d.organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
WHERE NOT EXISTS (
  SELECT 1 FROM maturity_practice_statements existing
  WHERE existing.mps_number = mps_data.mps_number 
    AND existing.organization_id = '2f122a62-ca59-4c8e-adf6-796aa7011c5d'
);