-- Create sample assessment framework data to demonstrate the implementation
-- Insert sample domains for the assessment framework
INSERT INTO public.domains (name, intent_statement, organization_id, display_order, created_by, updated_by) VALUES
('Governance and Risk Management', 'Establish effective governance structures and risk management processes to ensure organizational accountability and decision-making transparency.', '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9', 1, '9ef75fc4-0a45-4c90-bd26-1b5898846326', '9ef75fc4-0a45-4c90-bd26-1b5898846326'),
('Information Security', 'Implement comprehensive information security controls to protect organizational data and systems from threats and vulnerabilities.', '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9', 2, '9ef75fc4-0a45-4c90-bd26-1b5898846326', '9ef75fc4-0a45-4c90-bd26-1b5898846326'),
('Business Continuity', 'Develop and maintain business continuity capabilities to ensure operational resilience during disruptions and emergencies.', '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9', 3, '9ef75fc4-0a45-4c90-bd26-1b5898846326', '9ef75fc4-0a45-4c90-bd26-1b5898846326')
ON CONFLICT (name, organization_id) DO NOTHING;

-- Insert sample maturity practice statements
WITH domain_refs AS (
  SELECT id, name FROM domains WHERE organization_id = '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9'
)
INSERT INTO public.maturity_practice_statements (domain_id, organization_id, mps_number, name, summary, intent_statement, created_by, updated_by) 
SELECT 
  d.id,
  '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9',
  ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY mps_data.name),
  mps_data.name,
  mps_data.summary,
  mps_data.intent,
  '9ef75fc4-0a45-4c90-bd26-1b5898846326',
  '9ef75fc4-0a45-4c90-bd26-1b5898846326'
FROM domain_refs d
CROSS JOIN (
  VALUES 
    ('Governance Framework', 'Establish organizational governance structure', 'Define clear governance roles, responsibilities, and decision-making processes'),
    ('Risk Assessment Process', 'Implement systematic risk identification and evaluation', 'Develop comprehensive risk assessment methodologies and procedures'),
    ('Security Policy Management', 'Create and maintain information security policies', 'Establish comprehensive security policies aligned with business objectives'),
    ('Access Control Management', 'Implement appropriate access controls', 'Ensure proper authentication, authorization, and access management'),
    ('Incident Response Planning', 'Develop incident response capabilities', 'Create effective incident detection, response, and recovery procedures'),
    ('Business Impact Analysis', 'Conduct business impact assessments', 'Identify critical business functions and assess potential impact of disruptions')
) AS mps_data(name, summary, intent)
WHERE (d.name = 'Governance and Risk Management' AND mps_data.name IN ('Governance Framework', 'Risk Assessment Process'))
   OR (d.name = 'Information Security' AND mps_data.name IN ('Security Policy Management', 'Access Control Management', 'Incident Response Planning'))
   OR (d.name = 'Business Continuity' AND mps_data.name IN ('Business Impact Analysis'))
ON CONFLICT DO NOTHING;

-- Create a sample assessment
INSERT INTO public.assessments (
  organization_id, 
  name, 
  description, 
  assessment_period_start, 
  assessment_period_end,
  status,
  created_by, 
  updated_by
) VALUES (
  '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9',
  'Annual Security Assessment 2025',
  'Comprehensive assessment of organizational security maturity and compliance status',
  '2025-01-01',
  '2025-12-31',
  'in_progress',
  '9ef75fc4-0a45-4c90-bd26-1b5898846326',
  '9ef75fc4-0a45-4c90-bd26-1b5898846326'
) ON CONFLICT DO NOTHING;