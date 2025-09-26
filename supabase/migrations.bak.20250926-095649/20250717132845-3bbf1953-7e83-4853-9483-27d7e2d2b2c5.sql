-- Create sample assessment framework data (fixed version)
-- Insert sample domains for the assessment framework
INSERT INTO public.domains (name, intent_statement, organization_id, display_order, created_by, updated_by) 
SELECT 'Governance and Risk Management', 'Establish effective governance structures and risk management processes to ensure organizational accountability and decision-making transparency.', '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9', 1, '9ef75fc4-0a45-4c90-bd26-1b5898846326', '9ef75fc4-0a45-4c90-bd26-1b5898846326'
WHERE NOT EXISTS (SELECT 1 FROM domains WHERE name = 'Governance and Risk Management' AND organization_id = '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9');

INSERT INTO public.domains (name, intent_statement, organization_id, display_order, created_by, updated_by)
SELECT 'Information Security', 'Implement comprehensive information security controls to protect organizational data and systems from threats and vulnerabilities.', '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9', 2, '9ef75fc4-0a45-4c90-bd26-1b5898846326', '9ef75fc4-0a45-4c90-bd26-1b5898846326'
WHERE NOT EXISTS (SELECT 1 FROM domains WHERE name = 'Information Security' AND organization_id = '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9');

INSERT INTO public.domains (name, intent_statement, organization_id, display_order, created_by, updated_by)
SELECT 'Business Continuity', 'Develop and maintain business continuity capabilities to ensure operational resilience during disruptions and emergencies.', '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9', 3, '9ef75fc4-0a45-4c90-bd26-1b5898846326', '9ef75fc4-0a45-4c90-bd26-1b5898846326'
WHERE NOT EXISTS (SELECT 1 FROM domains WHERE name = 'Business Continuity' AND organization_id = '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9');

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
) 
SELECT 
  '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9',
  'Annual Security Assessment 2025',
  'Comprehensive assessment of organizational security maturity and compliance status',
  '2025-01-01',
  '2025-12-31',
  'in_progress',
  '9ef75fc4-0a45-4c90-bd26-1b5898846326',
  '9ef75fc4-0a45-4c90-bd26-1b5898846326'
WHERE NOT EXISTS (SELECT 1 FROM assessments WHERE name = 'Annual Security Assessment 2025' AND organization_id = '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9');