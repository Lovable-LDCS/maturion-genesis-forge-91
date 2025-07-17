-- Insert the new milestone "Automated QA Sign-Off Workflows" for each organization that has the old milestone
INSERT INTO milestones (
  name,
  description,
  phase,
  week,
  priority,
  status,
  display_order,
  organization_id,
  created_by,
  updated_by
) 
SELECT 
  'Automated QA Sign-Off Workflows',
  'Implement full automation of milestone QA sign-offs, including webhook payload, Zapier integration, Slack alerting, and Google Sheet tracking.',
  'Foundation',
  4,
  'high',
  'not_started',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM milestones WHERE organization_id = m.organization_id),
  m.created_by,
  m.updated_by
FROM milestones m 
WHERE m.name = 'Assessment Framework Phase 1A - Database Enhancement';